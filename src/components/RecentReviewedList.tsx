"use client";

import { useState } from "react";
import Link from "next/link";

export type ReviewedItem = {
  id: string;
  applicantName: string | null;
  policyType: string;
  reviewerName: string | null;
  reviewedAtLabel: string;
  decision: string | null;
};

const TOP = 5;

export default function RecentReviewedList({ items }: { items: ReviewedItem[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, TOP);
  const extra = items.length - TOP;

  return (
    <>
      <div className="space-y-2">
        {visible.map((s) => (
          <Link
            key={s.id}
            href={`/policy/${s.id}`}
            className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3 hover:border-indigo-300 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{s.applicantName ?? "—"}</p>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {s.policyType} · by {s.reviewerName ?? "—"} · {s.reviewedAtLabel}
              </p>
            </div>
            <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              s.decision === "accept"
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                : "bg-red-100 text-red-700 border border-red-200"
            }`}>
              {s.decision === "accept" ? "Approved" : "Declined"}
            </span>
          </Link>
        ))}
      </div>
      {extra > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          {showAll ? "Show less" : `View all ${items.length} reviews`}
          <svg className={`w-3.5 h-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </>
  );
}
