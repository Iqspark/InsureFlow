"use client";

import { motion } from "framer-motion";

// A non-blocking, in-chat heads-up shown when an answer would refer or
// decline the policy. The conversation still continues; the broker can
// change the answer (Back / edit) or carry on.
export default function AdvisoryNotice({
  decision,
  text,
}: {
  decision?: "refer" | "decline";
  text: string;
}) {
  const decline = decision === "decline";
  const tone = decline
    ? { bg: "bg-rose-50", border: "border-rose-200", icon: "text-rose-500", title: "text-rose-800", body: "text-rose-700", hint: "text-rose-500" }
    : { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-500", title: "text-amber-800", body: "text-amber-700", hint: "text-amber-600" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex justify-center px-1"
    >
      <div className={`w-full max-w-[92%] rounded-xl border px-3.5 py-2.5 ${tone.bg} ${tone.border}`}>
        <div className="flex items-start gap-2">
          <svg className={`w-4 h-4 mt-0.5 shrink-0 ${tone.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div className="min-w-0">
            <p className={`text-xs font-semibold ${tone.title}`}>
              {decline
                ? "This answer may fall outside our coverage"
                : "This answer may need underwriter review"}
            </p>
            <p className={`text-xs mt-0.5 leading-snug ${tone.body}`}>{text}</p>
            <p className={`text-[11px] mt-1 ${tone.hint}`}>
              You can continue, or change your answer above.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
