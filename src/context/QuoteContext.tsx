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
import { interpolate } from "@/utils/interpolate";

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

// ── Context shape ────────────────────────────────────────────
interface QuoteContextValue {
  phase: AppPhase;
  questions: Question[];
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
    displayValue: string
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
      displayValue: string
    ) => {
      const newAnswers = {
        ...answers,
        [questionId]: { questionId, value, displayValue },
      };
      setAnswers(newAnswers);

      setConversationMessages((prev) => [
        ...prev,
        {
          id: `user-${questionId}-${Date.now()}`,
          type: "user",
          text: displayValue,
          questionId,
        },
      ]);

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

      const nextId = resolveNextQuestionId(questions, questionId, value, newAnswers);

      if (nextId === "__SUBMIT__") {
        setPhase("summary");
        return;
      }

      const currentIdx = questionHistory.indexOf(questionId);
      setQuestionHistory((prev) => {
        const trimmed = prev.slice(0, currentIdx + 1);
        return [...trimmed, nextId];
      });
      setCurrentQuestionId(nextId);
    },
    [answers, questionHistory]
  );

  const goBack = useCallback(() => {
    const idx = questionHistory.indexOf(currentQuestionId);
    if (idx <= 0) return;

    const prevId = questionHistory[idx - 1];

    // Remove messages related to the current question (broker + user)
    setConversationMessages((prev) =>
      prev.filter((m) => m.questionId !== currentQuestionId)
    );

    // Remove the current question's answer
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[currentQuestionId];
      return next;
    });

    setCurrentQuestionId(prevId);
    // Re-trigger the broker message for the previous question by
    // removing it from conversation so ConversationView re-adds it.
    setConversationMessages((prev) =>
      prev.filter((m) => m.questionId !== prevId)
    );
  }, [currentQuestionId, questionHistory]);

  const goToQuestion = useCallback((targetId: string) => {
    const idx = questionHistory.indexOf(targetId);
    if (idx === -1) return;

    // Clear messages and answers for targetId and everything after it
    const toRemove = new Set(questionHistory.slice(idx));
    setConversationMessages((prev) =>
      prev.filter((m) => !m.questionId || !toRemove.has(m.questionId))
    );
    setAnswers((prev) => {
      const next = { ...prev };
      toRemove.forEach((qId) => delete next[qId]);
      return next;
    });
    setQuestionHistory((prev) => prev.slice(0, idx + 1));
    setCurrentQuestionId(targetId);
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
