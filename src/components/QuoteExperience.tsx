"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { QuoteProvider, useQuote } from "@/context/QuoteContext";
import IntroScreen from "@/components/IntroScreen";
import ConversationView from "@/components/ConversationView";
import SummaryScreen from "@/components/SummaryScreen";
import QuoteResult from "@/components/QuoteResult";
import QuestionProgressRail from "@/components/QuestionProgressRail";
import { Answer } from "@/types";

function QuoteShell() {
  const { phase, resumeFromDraft } = useQuote();
  const searchParams = useSearchParams();

  useEffect(() => {
    const resumeId = searchParams.get("resume");
    if (!resumeId) return;

    fetch(`/api/drafts/${resumeId}`)
      .then((res) => res.json())
      .then((data: { answers?: Record<string, Answer> }) => {
        if (data.answers) resumeFromDraft(data.answers, resumeId);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showRail = phase === "conversation" || phase === "summary";

  return (
    <div className="flex-1 flex items-center justify-center sm:p-4 min-h-0">
      <div className="flex items-stretch gap-5">
        {showRail && (
          <QuestionProgressRail className="hidden lg:flex quote-shell-height" />
        )}
        <div className="app-shell quote-shell-height w-full sm:max-w-md bg-white/60 backdrop-blur-md sm:rounded-3xl sm:shadow-2xl sm:shadow-indigo-200/40 overflow-hidden sm:border sm:border-white/80 flex flex-col">
        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.div key="intro" className="flex-1 flex flex-col overflow-hidden">
              <IntroScreen />
            </motion.div>
          )}

          {phase === "conversation" && (
            <motion.div
              key="conversation"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <ConversationView />
            </motion.div>
          )}

          {phase === "summary" && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <SummaryScreen />
            </motion.div>
          )}

          {phase === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <QuoteResult />
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function QuoteExperience({ productId }: { productId: string }) {
  return (
    <QuoteProvider productId={productId}>
      <QuoteShell />
    </QuoteProvider>
  );
}
