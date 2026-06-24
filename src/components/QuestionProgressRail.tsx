"use client";

import { useQuote } from "@/context/QuoteContext";
import { orderedSections, sectionForQuestion } from "@/utils/sections";

// A vertical "wizard" rail beside the chat. The fill line starts at the
// top and slides down as sections are completed, reaching the bottom when
// the applicant arrives at the review/summary step.
export default function QuestionProgressRail({ className = "" }: { className?: string }) {
  const { questions, answers, currentQuestionId, phase } = useQuote();

  const sections = orderedSections(questions);
  const n = sections.length;
  const complete = phase === "summary" || phase === "result";

  const sectionIndexOf = (qid: string): number => {
    const q = questions.find((x) => x.id === qid);
    return q ? sections.indexOf(sectionForQuestion(q)) : -1;
  };

  // Monotonic active index: the furthest section reached (handles flows that
  // briefly revisit an earlier section, so the rail never slides back up).
  let activeIdx = Math.max(0, sectionIndexOf(currentQuestionId));
  for (const qid of Object.keys(answers)) {
    activeIdx = Math.max(activeIdx, sectionIndexOf(qid));
  }
  if (complete) activeIdx = n;

  // Smooth fill: section index + fraction answered within the active section.
  let subFrac = 0;
  if (!complete && activeIdx < n) {
    const inSection = questions.filter((q) => sectionForQuestion(q) === sections[activeIdx]);
    const answered = inSection.filter((q) => answers[q.id] !== undefined).length;
    subFrac = inSection.length ? Math.min(answered / inSection.length, 0.92) : 0;
  }
  const denom = Math.max(1, n - 1);
  const fillPct = complete ? 100 : Math.min(100, ((activeIdx + subFrac) / denom) * 100);

  return (
    <aside
      className={`flex-col w-56 shrink-0 bg-white/60 backdrop-blur-md rounded-3xl border border-white/80 shadow-2xl shadow-indigo-200/40 p-5 ${className}`}
    >
      <div className="mb-5">
        <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">
          Application
        </p>
        <h3 className="text-sm font-bold text-slate-800">Your progress</h3>
      </div>

      {/* Vertical stepper */}
      <div className="relative flex-1 ml-[9px]">
        {/* Track */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-slate-200 rounded-full" />
        {/* Fill — slides down with progress */}
        <div
          className="absolute left-0 top-0 w-0.5 -translate-x-1/2 bg-linear-to-b from-indigo-400 to-indigo-600 rounded-full transition-all duration-700 ease-out"
          style={{ height: `${fillPct}%` }}
        />

        {sections.map((s, i) => {
          const done = i < activeIdx;
          const active = i === activeIdx && !complete;
          return (
            <div
              key={s}
              className="absolute left-0 flex items-center gap-3"
              style={{ top: `${(i / denom) * 100}%`, transform: "translateY(-50%)" }}
            >
              <span
                className={`z-10 -translate-x-1/2 flex items-center justify-center w-[18px] h-[18px] rounded-full border-2 transition-colors duration-500 ${
                  done
                    ? "bg-indigo-600 border-indigo-600"
                    : active
                    ? "bg-white border-indigo-500 shadow-xs shadow-indigo-200"
                    : "bg-white border-slate-300"
                }`}
              >
                {done ? (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : active ? (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                ) : null}
              </span>
              <span
                className={`whitespace-nowrap text-xs transition-colors duration-500 ${
                  done
                    ? "text-slate-600 font-medium"
                    : active
                    ? "text-indigo-700 font-semibold"
                    : "text-slate-400"
                }`}
              >
                {s}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-400">
          {complete ? "Complete" : `Step ${Math.min(activeIdx + 1, n)} of ${n}`}
        </span>
        <span className="font-bold text-indigo-600">{Math.round(fillPct)}%</span>
      </div>
    </aside>
  );
}