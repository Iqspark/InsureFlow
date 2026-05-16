"use client";

import { AnimatePresence, motion } from "framer-motion";
import { QuoteProvider, useQuote } from "@/context/QuoteContext";
import IntroScreen from "@/components/IntroScreen";
import ConversationView from "@/components/ConversationView";
import SummaryScreen from "@/components/SummaryScreen";
import QuoteResult from "@/components/QuoteResult";

function AppShell() {
  const { phase } = useQuote();

  return (
    // Outer shell — phone-sized card on desktop, full screen on mobile
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md h-[calc(100vh-2rem)] max-h-[780px] bg-white/60 backdrop-blur-md rounded-3xl shadow-2xl shadow-indigo-200/40 overflow-hidden border border-white/80 flex flex-col">
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
  );
}

export default function Home() {
  return (
    <QuoteProvider>
      <AppShell />
    </QuoteProvider>
  );
}
