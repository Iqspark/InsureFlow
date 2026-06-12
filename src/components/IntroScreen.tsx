"use client";

import { motion } from "framer-motion";
import { useQuote } from "@/context/QuoteContext";

export default function IntroScreen() {
  const { startConversation, intro } = useQuote();

  return (
    <motion.div
      key="intro"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col h-full items-center justify-center px-6 py-10 text-center"
    >
      {/* Logo / avatar */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-200 mb-6"
      >
        <span className="text-white text-3xl">{intro.emoji}</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3 mb-8"
      >
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {intro.title}
        </h1>
        <p className="text-slate-500 text-base leading-relaxed max-w-xs mx-auto">
          {intro.subtitle}
        </p>
      </motion.div>

      {/* Feature pills */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="flex flex-wrap justify-center gap-2 mb-10"
      >
        {[
          { emoji: "⚡", label: "Instant quote" },
          { emoji: "🔒", label: "100% secure" },
          { emoji: "📋", label: "No paperwork" },
        ].map((f) => (
          <span
            key={f.label}
            className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
          >
            <span>{f.emoji}</span>
            {f.label}
          </span>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={startConversation}
        className="w-full max-w-xs py-4 bg-indigo-600 text-white rounded-2xl font-bold text-base shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors"
      >
        Get my free quote →
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-xs text-slate-400 mt-4"
      >
        Takes about 3 minutes · No credit card required
      </motion.p>
    </motion.div>
  );
}
