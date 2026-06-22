"use client";

import { useState } from "react";
import Link from "next/link";

export type ActionItem = {
  id: string;
  applicantName: string | null;
  policyType: string;
  needsPayment: boolean;
};

const TOP = 5;

export default function ActionRequiredList({ items }: { items: ActionItem[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, TOP);
  const hidden = items.length - TOP;

  return (
    <>
      <div className="divide-y divide-orange-100 border-t border-orange-200">
        {visible.map((s) => (
          <Link
            key={s.id}
            href={`/policy/${s.id}`}
            className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-orange-100/50 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{s.applicantName ?? "—"}</p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {s.policyType}
                <span className="mx-1.5 text-slate-300">·</span>
                {s.needsPayment ? "Bound — awaiting customer payment" : "Approved — ready to bind"}
              </p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-white border border-orange-300 px-3 py-1.5 rounded-full">
              {s.needsPayment ? "Resend Link" : "Buy Now"}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        ))}
      </div>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="block w-full px-5 py-2.5 text-xs font-semibold text-orange-700 hover:bg-orange-100/50 border-t border-orange-200 text-center transition-colors"
        >
          {showAll ? "Show less" : `Show ${hidden} more`}
        </button>
      )}
    </>
  );
}
