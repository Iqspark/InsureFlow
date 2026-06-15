"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { Answer, AppPhase, QuoteDetails, ConversationMessage, Question } from "@/types";
import { getProduct, DEFAULT_PRODUCT_ID } from "@/data/products";
import { evaluateAnswerRules } from "@/engine/underwritingEngine";
import { interpolate } from "@/utils/interpolate";

// Builds a non-blocking advisory message if an answer triggers a refer/decline
// rule on its question. Decline takes precedence over refer.
function buildAdvisory(
  question: Question,
  value: string | number | boolean
): ConversationMessage | null {
  const triggered = evaluateAnswerRules(question, value);
  if (!triggered.length) return null;
  const rule = triggered.find((r) => r.decision === "decline") ?? triggered[0];
  return {
    id: `advisory-${question.id}-${Date.now()}`,
    type: "advisory",
    decision: rule.decision,
    text: rule.message,
    questionId: question.id,
  };
}

function advisoryForAnswer(
  questions: Question[],
  qId: string,
  answers: Record<string, Answer>
): ConversationMessage | null {
  const q = questions.find((x) => x.id === qId);
  const a = answers[qId];
  if (!q || !a) return null;
  return buildAdvisory(q, a.value);
}

// ── Routing helper ───────────────────────────────────────────
function resolveNextQuestionId(
  questions: Question[],
  questionId: string,
  value: string | number | boolean,
  answers: Record<string, Answer>
): string {
  const question = questions.find((q) => q.id === questionId);
  if (!question) return "__SUBMIT__";

  if (question.conditionalBranches?.length) {
    for (const branch of question.conditionalBranches) {
      const compareValue = branch.when.questionId
        ? answers[branch.when.questionId]?.value
        : value;
      if (compareValue === branch.when.value) {
        return branch.nextQuestionId;
      }
    }
  }
  return question.defaultNextQuestionId ?? "__SUBMIT__";
}

// Walks the question path from the start, following the answers that exist,
// until it reaches an unanswered question or the end. Returns the ordered
// path and the stop point ("__SUBMIT__" if every question on the path is
// answered, otherwise the first unanswered question id).
function walkAnsweredPath(
  questions: Question[],
  answers: Record<string, Answer>,
  firstQuestionId: string
): { path: string[]; stopId: string } {
  const path = [firstQuestionId];
  let walkId = firstQuestionId;
  // Guard against cycles in misconfigured data.
  while (answers[walkId] && path.length <= questions.length + 1) {
    const nextId = resolveNextQuestionId(
      questions,
      walkId,
      answers[walkId].value,
      answers
    );
    if (nextId === "__SUBMIT__") return { path, stopId: "__SUBMIT__" };
    path.push(nextId);
    walkId = nextId;
  }
  return { path, stopId: walkId };
}

// ── Context shape ────────────────────────────────────────────
interface QuoteContextValue {
  phase: AppPhase;
  questions: Question[];
  questionHistory: string[];
  policyType: string;
  intro: { emoji: string; title: string; subtitle: string };
  answers: Record<string, Answer>;
  currentQuestionId: string;
  conversationMessages: ConversationMessage[];
  quoteDetails: QuoteDetails | null;
  submissionId: string | null;
  progress: number;
  canGoBack: boolean;
  startConversation: () => void;
  submitAnswer: (
    questionId: string,
    value: string | number | boolean,
    displayValue: string,
    extra?: Record<string, { value: string | number | boolean; displayValue: string }>
  ) => void;
  goBack: () => void;
  goToQuestion: (questionId: string) => void;
  confirmSummary: () => void;
  restart: () => void;
  addBrokerMessage: (text: string, questionId: string) => void;
  resumeFromDraft: (savedAnswers: Record<string, Answer>, draftId: string) => void;
}

const QuoteContext = createContext<QuoteContextValue | null>(null);

export function useQuote() {
  const ctx = useContext(QuoteContext);
  if (!ctx) throw new Error("useQuote must be used within QuoteProvider");
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────
export function QuoteProvider({
  children,
  productId = DEFAULT_PRODUCT_ID,
}: {
  children: ReactNode;
  productId?: string;
}) {
  const product = useRef(getProduct(productId)).current;
  const questions = product.questions;
  const firstQuestionId = product.firstQuestionId;

  const sessionId = useRef<string>(
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
  const draftIdRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<AppPhase>("intro");
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [questionHistory, setQuestionHistory] = useState<string[]>([
    firstQuestionId,
  ]);
  const [currentQuestionId, setCurrentQuestionId] =
    useState(firstQuestionId);
  const [conversationMessages, setConversationMessages] = useState<
    ConversationMessage[]
  >([]);
  const [quoteDetails, setQuoteDetails] = useState<QuoteDetails | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const historyIndex = questionHistory.indexOf(currentQuestionId);
  const progress = Math.min(
    Math.round((historyIndex / questions.length) * 100),
    95
  );
  const canGoBack = historyIndex > 0;

  const addBrokerMessage = useCallback(
    (text: string, questionId: string) => {
      setConversationMessages((prev) => [
        ...prev,
        {
          id: `broker-${questionId}-${Date.now()}`,
          type: "broker",
          text,
          questionId,
        },
      ]);
    },
    []
  );

  const startConversation = useCallback(() => {
    setPhase("conversation");
  }, []);

  const submitAnswer = useCallback(
    (
      questionId: string,
      value: string | number | boolean,
      displayValue: string,
      extra?: Record<string, { value: string | number | boolean; displayValue: string }>
    ) => {
      // Derived answers (e.g. province auto-filled from the address) are set
      // alongside the main answer so they persist atomically.
      const extraEntries = extra
        ? Object.fromEntries(
            Object.entries(extra).map(([id, a]) => [
              id,
              { questionId: id, value: a.value, displayValue: a.displayValue },
            ])
          )
        : {};
      const merged = {
        ...answers,
        ...extraEntries,
        [questionId]: { questionId, value, displayValue },
      };

      // Non-blocking advisory if this answer (or a derived one) would
      // refer/decline the policy.
      const advisories: ConversationMessage[] = [];
      const mainQ = questions.find((q) => q.id === questionId);
      if (mainQ) {
        const adv = buildAdvisory(mainQ, value);
        if (adv) advisories.push(adv);
      }
      for (const [id, a] of Object.entries(extraEntries)) {
        const q = questions.find((x) => x.id === id);
        if (q) {
          const adv = buildAdvisory(q, a.value);
          if (adv) advisories.push(adv);
        }
      }

      // Add the user's reply bubble for the question just answered.
      setConversationMessages((prev) => [
        ...prev,
        {
          id: `user-${questionId}-${Date.now()}`,
          type: "user",
          text: displayValue,
          questionId,
        },
        ...advisories,
      ]);

      // Re-walk the path with the updated answers so editing an earlier
      // answer doesn't force re-answering the rest.
      const { path, stopId } = walkAnsweredPath(questions, merged, firstQuestionId);

      // Only prune answers from abandoned branches once the path is FULLY
      // answered (reached the end). While questions remain unanswered — e.g.
      // an edit temporarily introduces a new question mid-flow — keep every
      // answer so later ones (phone, email) aren't lost and reappear once the
      // gap is filled. Off-path answers never reach the engine: they're pruned
      // here at completion, before the summary/quote is calculated.
      let newAnswers = merged;
      if (stopId === "__SUBMIT__") {
        const pathSet = new Set(path);
        newAnswers = {};
        for (const [id, ans] of Object.entries(merged)) {
          if (pathSet.has(id)) newAnswers[id] = ans;
        }
      }
      setAnswers(newAnswers);
      setQuestionHistory(path);

      // Auto-save a draft once 3+ answers are collected
      if (Object.keys(newAnswers).length >= 3) {
        void fetch("/api/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: newAnswers,
            sessionId: sessionId.current,
            draftId: draftIdRef.current,
            policyType: product.policyType,
          }),
        })
          .then((res) => res.json())
          .then((data: { id?: string }) => {
            if (data.id) draftIdRef.current = data.id;
          })
          .catch(() => {});
      }

      // When editing an earlier answer, the questions between it and the
      // resume point are already answered — re-add their bubbles so the
      // conversation stays consistent (no need to re-answer them).
      const idx = path.indexOf(questionId);
      const skipped =
        idx === -1
          ? []
          : stopId === "__SUBMIT__"
          ? path.slice(idx + 1)
          : path.slice(idx + 1, path.length - 1);
      if (skipped.length > 0) {
        setConversationMessages((prev) => {
          const msgs = [...prev];
          for (const qId of skipped) {
            const q = questions.find((x) => x.id === qId);
            const ans = newAnswers[qId];
            if (!q || !ans) continue;
            msgs.push({
              id: `broker-${qId}-edit-${Date.now()}`,
              type: "broker",
              text: interpolate(q.brokerText, newAnswers),
              questionId: qId,
            });
            msgs.push({
              id: `user-${qId}-edit-${Date.now()}`,
              type: "user",
              text: ans.displayValue,
              questionId: qId,
            });
            const adv = buildAdvisory(q, ans.value);
            if (adv) msgs.push(adv);
          }
          return msgs;
        });
      }

      if (stopId === "__SUBMIT__") {
        setPhase("summary");
        return;
      }
      setCurrentQuestionId(stopId);
    },
    [answers]
  );

  const goBack = useCallback(() => {
    const idx = questionHistory.indexOf(currentQuestionId);
    if (idx <= 0) return;

    const prevId = questionHistory[idx - 1];

    // Hide messages from the previous question onward so it can be re-answered.
    // Answers are KEPT so the later questions auto-populate when moving forward.
    const fromPrev = new Set(questionHistory.slice(idx - 1));
    setConversationMessages((prev) =>
      prev.filter((m) => !m.questionId || !fromPrev.has(m.questionId))
    );
    setCurrentQuestionId(prevId);
  }, [currentQuestionId, questionHistory]);

  const goToQuestion = useCallback((targetId: string) => {
    const idx = questionHistory.indexOf(targetId);
    if (idx === -1) return;

    // Hide messages from the target onward; KEEP answers so they auto-populate
    // when the user moves forward again after editing this one answer.
    const fromTarget = new Set(questionHistory.slice(idx));
    setConversationMessages((prev) =>
      prev.filter((m) => !m.questionId || !fromTarget.has(m.questionId))
    );
    setCurrentQuestionId(targetId);
    // Return to the chat to edit (e.g. when triggered from the summary screen).
    setPhase("conversation");
  }, [questionHistory]);

  const confirmSummary = useCallback(() => {
    const result = product.calculate(answers);
    setQuoteDetails(result);
    setPhase("result");

    // Promote the draft to complete (or create new if no draft exists).
    void fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers,
        quoteDetails: result,
        sessionId: sessionId.current,
        draftId: draftIdRef.current,
        policyType: product.policyType,
      }),
    })
      .then((res) => res.json())
      .then((data: { id?: string }) => {
        if (data.id) setSubmissionId(data.id);
      })
      .catch((err) => console.error("[DB save failed]", err));
  }, [answers]);

  const resumeFromDraft = useCallback(
    (savedAnswers: Record<string, Answer>, draftId: string) => {
      // Replay answer path to rebuild question history
      const history: string[] = [firstQuestionId];
      let currentId = firstQuestionId;

      while (savedAnswers[currentId]) {
        const nextId = resolveNextQuestionId(
          questions,
          currentId,
          savedAnswers[currentId].value,
          savedAnswers
        );
        if (nextId === "__SUBMIT__") break;
        history.push(nextId);
        currentId = nextId;
      }

      // Reconstruct messages for all previously answered questions
      const messages: ConversationMessage[] = [];
      for (const qId of history) {
        if (!savedAnswers[qId]) break; // stop before the unanswered current question
        const question = questions.find((q) => q.id === qId);
        if (question) {
          messages.push({
            id: `broker-${qId}-resume`,
            type: "broker",
            text: interpolate(question.brokerText, savedAnswers),
            questionId: qId,
          });
        }
        messages.push({
          id: `user-${qId}-resume`,
          type: "user",
          text: savedAnswers[qId].displayValue,
          questionId: qId,
        });
        const adv = advisoryForAnswer(questions, qId, savedAnswers);
        if (adv) messages.push(adv);
      }

      draftIdRef.current = draftId;
      setAnswers(savedAnswers);
      setQuestionHistory(history);
      setCurrentQuestionId(currentId);
      setConversationMessages(messages);
      setPhase("conversation");
    },
    []
  );

  const restart = useCallback(() => {
    setPhase("intro");
    setAnswers({});
    setQuestionHistory([firstQuestionId]);
    setCurrentQuestionId(firstQuestionId);
    setConversationMessages([]);
    setQuoteDetails(null);
    setSubmissionId(null);
    draftIdRef.current = null;
  }, []);

  return (
    <QuoteContext.Provider
      value={{
        phase,
        questions,
        questionHistory,
        policyType: product.policyType,
        intro: product.intro,
        answers,
        currentQuestionId,
        conversationMessages,
        quoteDetails,
        submissionId,
        progress,
        canGoBack,
        startConversation,
        submitAnswer,
        goBack,
        goToQuestion,
        confirmSummary,
        restart,
        addBrokerMessage,
        resumeFromDraft,
      }}
    >
      {children}
    </QuoteContext.Provider>
  );
}
