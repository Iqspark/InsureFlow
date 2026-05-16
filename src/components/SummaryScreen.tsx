"use client";

import { motion } from "framer-motion";
import { useQuote } from "@/context/QuoteContext";
import { QUESTIONS } from "@/data/questions";

export default function SummaryScreen() {
  const { answers, confirmSummary, restart } = useQuote();

  const answeredQuestions = QUESTIONS.filter((q) => answers[q.id] !== undefined);

  return (
    <motion.div
      key="summary"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shadow-md">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              Let's review your details
            </h1>
            <p className="text-sm text-slate-500">
              Everything look right? We'll calculate your quote next.
            </p>
          </div>
        </div>
      </div>

      {/* Summary list */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2">
        {answeredQuestions.map((q, i) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
            className="flex items-start justify-between bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100 gap-4"
          >
            <div className="min-w-0">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide leading-none mb-0.5">
                {getSectionLabel(q.id)}
              </p>
              <p className="text-xs text-slate-500 leading-snug mt-0.5">
                {/* Short question label — first clause of brokerText */}
                {q.brokerText
                  .replace(/\{\{[^}]+\}\}/g, "")
                  .split("?")[0]
                  .replace(/[^a-zA-Z0-9\s,'"-]/g, "")
                  .trim()
                  .slice(0, 60)}
                ?
              </p>
            </div>
            <span className="flex-shrink-0 text-sm font-semibold text-indigo-700 text-right max-w-[45%]">
              {answers[q.id]?.displayValue}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 px-5 pb-8 pt-3 space-y-3">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={confirmSummary}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-base shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all"
        >
          Calculate My Quote →
        </motion.button>
        <button
          onClick={restart}
          className="w-full py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Start over
        </button>
      </div>
    </motion.div>
  );
}

// Helper to derive a short section label from the question id
function getSectionLabel(id: string): string {
  const map: Record<string, string> = {
    applicant_name: "About You",
    property_province: "Property",
    property_type: "Property",
    year_built: "Property",
    square_footage: "Property",
    property_value: "Valuation",
    coverage_amount: "Coverage",
    deductible: "Coverage",
    vacancy_duration: "Vacancy",
    vacancy_reason: "Vacancy",
    property_inspections: "Management",
    utilities_winterized: "Management",
    security_features: "Security",
    has_pool: "Features",
    pool_fenced: "Features",
    prior_damage: "Loss History",
    damage_type: "Loss History",
    prior_claims: "Loss History",
    prior_insurance: "Loss History",
    contact_email: "Contact",
  };
  return map[id] ?? "Details";
}
