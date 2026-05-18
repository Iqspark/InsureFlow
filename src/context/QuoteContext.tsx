"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { Answer, AppPhase, QuoteDetails, ConversationMessage } from "@/types";
import { QUESTIONS, FIRST_QUESTION_ID, TOTAL_QUESTIONS } from "@/data/questions";
import { calculateQuote } from "@/engine/quoteCalculator";

// ── Routing helper ───────────────────────────────────────────
function resolveNextQuestionId(
  questionId: string,
  value: string | number | boolean,
  answers: Record<string, Answer>
): string {
  const question = QUESTIONS.find((q) => q.id === questionId);
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
}

const QuoteContext = createContext<QuoteContextValue | null>(null);

export function useQuote() {
  const ctx = useContext(QuoteContext);
  if (!ctx) throw new Error("useQuote must be used within QuoteProvider");
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────
export function QuoteProvider({ children }: { children: ReactNode }) {
  const sessionId = useRef<string>(
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
  const draftIdRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<AppPhase>("intro");
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [questionHistory, setQuestionHistory] = useState<string[]>([
    FIRST_QUESTION_ID,
  ]);
  const [currentQuestionId, setCurrentQuestionId] =
    useState(FIRST_QUESTION_ID);
  const [conversationMessages, setConversationMessages] = useState<
    ConversationMessage[]
  >([]);
  const [quoteDetails, setQuoteDetails] = useState<QuoteDetails | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const historyIndex = questionHistory.indexOf(currentQuestionId);
  const progress = Math.min(
    Math.round((historyIndex / TOTAL_QUESTIONS) * 100),
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
          }),
        })
          .then((res) => res.json())
          .then((data: { id?: string }) => {
            if (data.id) draftIdRef.current = data.id;
          })
          .catch(() => {});
      }

      const nextId = resolveNextQuestionId(questionId, value, newAnswers);

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
    const result = calculateQuote(answers);
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
      }),
    })
      .then((res) => res.json())
      .then((data: { id?: string }) => {
        if (data.id) setSubmissionId(data.id);
      })
      .catch((err) => console.error("[DB save failed]", err));
  }, [answers]);

  const restart = useCallback(() => {
    setPhase("intro");
    setAnswers({});
    setQuestionHistory([FIRST_QUESTION_ID]);
    setCurrentQuestionId(FIRST_QUESTION_ID);
    setConversationMessages([]);
    setQuoteDetails(null);
    setSubmissionId(null);
    draftIdRef.current = null;
  }, []);

  return (
    <QuoteContext.Provider
      value={{
        phase,
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
      }}
    >
      {children}
    </QuoteContext.Provider>
  );
}
