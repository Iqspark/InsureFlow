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
    addBrokerMessage,
  } = useQuote();

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
            onClick={goBack}
            className="text-xs text-slate-400 hover:text-indigo-500 transition-colors mt-1"
          >
            ← Go back
          </button>
        )}
      </div>
    </div>
  );
}
