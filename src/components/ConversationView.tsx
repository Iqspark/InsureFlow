"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuote } from "@/context/QuoteContext";
import { QUESTIONS } from "@/data/questions";
import { interpolate } from "@/utils/interpolate";
import ChatBubble from "./ChatBubble";
import TypingIndicator from "./TypingIndicator";
import ProgressBar from "./ProgressBar";
import InputRenderer from "./InputRenderer";

const TYPING_DELAY_MS = 1100;

export default function ConversationView() {
  const {
    currentQuestionId,
    answers,
    conversationMessages,
    progress,
    canGoBack,
    submitAnswer,
    goBack,
    goToQuestion,
    addBrokerMessage,
  } = useQuote();

  const [changeText, setChangeText] = useState("");
  const [changeLoading, setChangeLoading] = useState(false);
  const changeInputRef = useRef<HTMLInputElement>(null);

  const [showTyping, setShowTyping] = useState(true);
  const [inputReady, setInputReady] = useState(false);
  const [prevQuestionId, setPrevQuestionId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const currentQuestion = QUESTIONS.find((q) => q.id === currentQuestionId);

  // Scroll to bottom whenever messages change or typing indicator toggles
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages, showTyping, inputReady]);

  // When the current question changes, show the typing indicator,
  // then inject the broker message and reveal the input.
  useEffect(() => {
    if (prevQuestionId === currentQuestionId) return;
    setPrevQuestionId(currentQuestionId);

    // Check if broker message for this question is already in history
    const alreadyAdded = conversationMessages.some(
      (m) => m.type === "broker" && m.questionId === currentQuestionId
    );
    if (alreadyAdded) {
      setShowTyping(false);
      setInputReady(true);
      return;
    }

    setShowTyping(true);
    setInputReady(false);

    const timer = setTimeout(() => {
      if (currentQuestion) {
        const text = interpolate(currentQuestion.brokerText, answers);
        addBrokerMessage(text, currentQuestionId);
      }
      setShowTyping(false);
      setInputReady(true);
    }, TYPING_DELAY_MS);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionId]);

  const handleSubmit = (value: string | number | boolean, displayValue: string) => {
    setInputReady(false);
    submitAnswer(currentQuestionId, value, displayValue);
  };

  async function handleChangeRequest() {
    const text = changeText.trim();
    if (!text || changeLoading) return;

    setChangeText("");
    setChangeLoading(true);

    // Show the user's message in chat
    addBrokerMessage(`You asked: "${text}"`, `change-user-${Date.now()}`);

    const answeredQuestions = QUESTIONS
      .filter((q) => answers[q.id])
      .map((q) => ({
        id: q.id,
        label: q.brokerText.replace(/{{.*?}}/g, "").slice(0, 80),
        currentAnswer: answers[q.id]?.displayValue ?? "",
      }));

    try {
      const res = await fetch("/api/chat-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, questions: answeredQuestions }),
      });
      const data = await res.json() as { questionId: string | null; reply: string };

      addBrokerMessage(data.reply ?? "Let me take you back to that question.", `change-reply-${Date.now()}`);

      if (data.questionId) {
        await new Promise((r) => setTimeout(r, 800));
        goToQuestion(data.questionId);
      }
    } catch {
      addBrokerMessage("Sorry, something went wrong. Please use the back button to navigate.", `change-err-${Date.now()}`);
    } finally {
      setChangeLoading(false);
      changeInputRef.current?.focus();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-2.5 bg-white/80 backdrop-blur-sm border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">Alex</p>
              <p className="text-[10px] text-emerald-500 font-medium">● Online</p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Vacant Home Insurance
          </span>
        </div>
        <ProgressBar value={progress} />
      </div>

      {/* Chat scroll area */}
      <div className="flex-1 overflow-y-auto chat-scroll px-4 py-5 space-y-3">
        {/* Conversation history */}
        {conversationMessages.map((msg) => (
          <ChatBubble key={msg.id} type={msg.type} text={msg.text} />
        ))}

        {/* Typing indicator */}
        <AnimatePresence>
          {showTyping && <TypingIndicator key="typing" />}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 bg-white/90 backdrop-blur-sm border-t border-slate-100 px-4 pt-3 pb-4 space-y-2">
        {/* Helper text */}
        <AnimatePresence>
          {inputReady && currentQuestion?.helperText && (
            <motion.p
              key={`helper-${currentQuestionId}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-slate-400 px-1"
            >
              {currentQuestion.helperText}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Input widget */}
        <AnimatePresence mode="wait">
          {inputReady && currentQuestion && (
            <motion.div
              key={`input-${currentQuestionId}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <InputRenderer question={currentQuestion} onSubmit={handleSubmit} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back button */}
        {canGoBack && (
          <button
            type="button"
            onClick={goBack}
            className="text-xs text-slate-400 hover:text-indigo-500 transition-colors mt-1"
          >
            ← Go back
          </button>
        )}

        {/* Change-an-answer input — only shown once at least one question is answered */}
        {Object.keys(answers).length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100 pr-20 sm:pr-0">
            <p className="text-[10px] text-slate-400 mb-1.5 px-0.5">Want to change a previous answer?</p>
            <div className="flex gap-2">
              <input
                ref={changeInputRef}
                type="text"
                value={changeText}
                onChange={(e) => setChangeText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChangeRequest()}
                placeholder='e.g. "change my province to Quebec"'
                disabled={changeLoading}
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 placeholder-slate-300 focus:outline-none focus:border-indigo-400 focus:bg-white transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handleChangeRequest}
                disabled={!changeText.trim() || changeLoading}
                className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                {changeLoading ? (
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
