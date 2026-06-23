"use client";

import { useState } from "react";
import Link from "next/link";
import StageBadge from "@/components/StageBadge";
import PaymentBadge from "@/components/PaymentBadge";
import CancelledBadge from "@/components/CancelledBadge";

export type CustomerRow = {
  id: string;
  policyType: string;
  appId: string;
  premiumLabel: string | null;
  renewalLabel: string | null;
  renewalDays: number | null;
  purchased: boolean;
  paymentStatus: string;
  isDraft: boolean;
  cancelled: boolean;
  decision: string | null;
};

export type CustomerCardProps = {
  name: string;
  email: string | null;
  phone: string | null;
  policies: number;
  quotes: number;
  underReview: number;
  premiumLabel: string;
  nextRenewalLabel: string;
  rows: CustomerRow[];
};

function Row({ r }: { r: CustomerRow }) {
  return (
    <Link
      href={`/policy/${r.id}`}
      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{r.policyType}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          <span className="font-mono">{r.appId}</span>
          {r.premiumLabel && (
            <><span className="mx-1.5 text-slate-300">·</span>{r.premiumLabel}/yr</>
          )}
          {r.renewalLabel && (
            <>
              <span className="mx-1.5 text-slate-300">·</span>
              Renews {r.renewalLabel}
              {r.renewalDays != null && r.renewalDays <= 60 && (
                <span className="ml-1.5 text-amber-600 font-medium">({r.renewalDays}d)</span>
              )}
            </>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!r.isDraft && <StageBadge purchased={r.purchased} decision={r.decision} />}
        {r.purchased && (r.cancelled ? <CancelledBadge /> : <PaymentBadge paymentStatus={r.paymentStatus} />)}
      </div>
    </Link>
  );
}

export default function CustomerCard(c: CustomerCardProps) {
  const [open, setOpen] = useState(false);
  const extra = c.rows.length - 1;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header — click to expand all policies */}
      <button
        type="button"
        onClick={() => extra > 0 && setOpen((v) => !v)}
        className={`w-full text-left px-5 py-4 border-b border-slate-100 bg-slate-50 ${extra > 0 ? "cursor-pointer hover:bg-slate-100/70" : "cursor-default"} transition-colors`}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
              {c.name}
              {extra > 0 && (
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {c.email ?? "—"}
              {c.phone && <><span className="mx-1.5 text-slate-300">·</span>{c.phone}</>}
            </p>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Premium</p>
              <p className="text-sm font-bold text-emerald-600">{c.premiumLabel}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Policies</p>
              <p className="text-sm font-bold text-slate-900">{c.policies}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Quotes</p>
              <p className="text-sm font-bold text-slate-900">{c.quotes}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Under Review</p>
              <p className={`text-sm font-bold ${c.underReview > 0 ? "text-amber-600" : "text-slate-900"}`}>{c.underReview}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Next Renewal</p>
              <p className="text-sm font-bold text-slate-900">{c.nextRenewalLabel}</p>
            </div>
          </div>
        </div>
      </button>

      {/* Latest submission always visible; the rest expand on click */}
      <div className="divide-y divide-slate-100">
        <Row r={c.rows[0]} />
        {open && c.rows.slice(1).map((r) => <Row key={r.id} r={r} />)}
      </div>

      {extra > 0 && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full px-5 py-2.5 text-xs font-medium text-indigo-600 hover:bg-slate-50 border-t border-slate-100 text-center transition-colors"
        >
          + {extra} more {extra === 1 ? "policy" : "policies"} — click to expand
        </button>
      )}
    </div>
  );
}
