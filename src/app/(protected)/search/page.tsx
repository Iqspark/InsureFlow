"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PRODUCTS, productSlugForPolicyType } from "@/data/products";
import StageBadge from "@/components/StageBadge";
import PaymentBadge from "@/components/PaymentBadge";
import CancelledBadge from "@/components/CancelledBadge";
import DeleteQuoteButton from "@/components/DeleteQuoteButton";
import ExportCsvButton from "@/components/ExportCsvButton";
import EmptyState from "@/components/EmptyState";
import { policyNumber } from "@/utils/policyNumber";

type SearchResult = {
  id: string;
  createdAt: string;
  applicantName: string | null;
  policyType: string;
  decision: string | null;
  status: string;
  purchased: boolean;
  paymentStatus: string;
  cancelledAt: string | null;
  province: string | null;
  annualPremium: number | null;
  broker?: { name: string | null } | null;
};

function DecisionBadge({ decision, status }: { decision: string | null; status: string }) {
  if (status === "draft") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
        Draft
      </span>
    );
  }
  const styles: Record<string, string> = {
    accept:  "bg-emerald-100 text-emerald-700 border border-emerald-200",
    decline: "bg-red-100 text-red-700 border border-red-200",
    refer:   "bg-amber-100 text-amber-700 border border-amber-200",
  };
  const labels: Record<string, string> = {
    accept: "Accepted",
    decline: "Declined",
    refer: "Referred",
  };
  const d = decision ?? "";
  const cls = styles[d] ?? "bg-slate-100 text-slate-600 border border-slate-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {labels[d] ?? d}
    </span>
  );
}

export default function SearchPage() {
  const { data: sessionData } = useSession();
  const showBroker = sessionData?.user?.role !== "BROKER";
  // Underwriters work with bound policies only — no quotes in their search.
  const isUnderwriter = sessionData?.user?.role === "UNDERWRITER";
  const [name, setName]       = useState("");
  const [appId, setAppId]     = useState("");
  const [date, setDate]       = useState("");
  const [type, setType]       = useState("");
  const [stage, setStage]     = useState("");
  const [decision, setDecision] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ total: number; totalPages: number }>({ total: 0, totalPages: 1 });

  const PAGE_SIZE = 10;

  async function runSearch(targetPage: number) {
    setLoading(true);
    const params = new URLSearchParams();
    if (name)  params.set("name", name.trim());
    if (appId) params.set("appId", appId.trim());
    if (date)  params.set("date", date);
    if (type)  params.set("policyType", type);
    const effectiveStage = isUnderwriter ? "policy" : stage;
    if (effectiveStage) params.set("stage", effectiveStage);
    if (decision) params.set("decision", decision);
    params.set("limit", String(PAGE_SIZE));
    params.set("page", String(targetPage));

    try {
      const res  = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      setResults(data.data ?? []);
      setMeta(data.meta ?? { total: (data.data ?? []).length, totalPages: 1 });
      setPage(targetPage);
    } catch {
      setResults([]);
      setMeta({ total: 0, totalPages: 1 });
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    runSearch(1);
  }

  // Start with an empty search. Only auto-load all when arriving via a
  // "View all" link (/search?show=all).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("show") === "all") {
      runSearch(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClear() {
    setName("");
    setAppId("");
    setDate("");
    setType("");
    setStage("");
    setDecision("");
    setResults(null);
    setSearched(false);
    setPage(1);
    setMeta({ total: 0, totalPages: 1 });
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Search Policies
          </h1>
          <p className="text-slate-500 text-sm">
            Search across all your quoted and sold policies.
          </p>
        </div>

        {/* Search form */}
        <form
          onSubmit={handleSearch}
          className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 mb-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                Applicant Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Smith"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-hidden transition text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                Application ID
              </label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="e.g. CM8X4F2A1B"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-hidden transition text-sm font-mono"
              />
            </div>
            <div>
              <label htmlFor="search-date" className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                Policy Date
              </label>
              <input
                id="search-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                title="Policy Date"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-hidden transition text-sm"
              />
            </div>
            <div>
              <label htmlFor="search-type" className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                Policy Type
              </label>
              <select
                id="search-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                title="Policy Type"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-hidden transition text-sm"
              >
                <option value="">All types</option>
                {Object.values(PRODUCTS).map((p) => (
                  <option key={p.id} value={p.policyType}>
                    {p.policyType}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="search-stage" className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                Stage
              </label>
              {isUnderwriter ? (
                <select
                  id="search-stage"
                  value="policy"
                  disabled
                  title="Stage"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed outline-hidden text-sm"
                >
                  <option value="policy">Policies only</option>
                </select>
              ) : (
                <select
                  id="search-stage"
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  title="Stage"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-hidden transition text-sm"
                >
                  <option value="">Quotes &amp; Policies</option>
                  <option value="quote">Quotes only</option>
                  <option value="policy">Policies only</option>
                </select>
              )}
            </div>
            <div>
              <label htmlFor="search-decision" className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                Decision
              </label>
              <select
                id="search-decision"
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                title="Decision"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-hidden transition text-sm"
              >
                <option value="">All decisions</option>
                <option value="accept">Accepted</option>
                <option value="decline">Declined</option>
                <option value="refer">Referred</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Searching…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                  </svg>
                  Search
                </>
              )}
            </button>
            {searched && (
              <button
                type="button"
                onClick={handleClear}
                className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-600 font-medium rounded-lg transition-colors border border-slate-200 text-sm"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Results */}
        {results !== null && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-900 text-sm">Search Results</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  {meta.total} result{meta.total !== 1 ? "s" : ""}
                </span>
                {results.length > 0 && (
                  <ExportCsvButton
                    label="Export CSV"
                    params={{ name: name.trim(), appId: appId.trim(), date, policyType: type, stage: isUnderwriter ? "policy" : stage, decision }}
                  />
                )}
              </div>
            </div>

            {results.length === 0 ? (
              <EmptyState
                iconPath="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
                title="No results found"
                subtitle="Nothing matches those filters yet — try clearing one or searching a different name."
              />
            ) : (
              <div className="space-y-2">
                {results.map((r) => {
                  const href =
                    r.status === "draft"
                      ? `/new-quote/${productSlugForPolicyType(r.policyType)}?resume=${r.id}`
                      : `/policy/${r.id}`;
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 shadow-xs px-4 sm:px-5 py-3.5 hover:border-indigo-300 hover:shadow-md transition-all"
                    >
                      <Link href={href} className="min-w-0 flex-1 group">
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                          {r.applicantName ?? "—"}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {r.policyType}
                          {showBroker && (
                            <>
                              <span className="mx-1.5 text-slate-300">·</span>
                              {r.broker?.name ?? "—"}
                            </>
                          )}
                          <span className="mx-1.5 text-slate-300">·</span>
                          <span className="font-mono">{policyNumber(r)}</span>
                          <span className="mx-1.5 text-slate-300">·</span>
                          {new Date(r.createdAt).toLocaleDateString("en-CA", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </Link>
                      <div className="flex items-center gap-2 shrink-0">
                        <DecisionBadge decision={r.decision} status={r.status} />
                        {r.status !== "draft" && <StageBadge purchased={r.purchased} decision={r.decision} />}
                        {r.purchased && (r.cancelledAt ? <CancelledBadge /> : <PaymentBadge paymentStatus={r.paymentStatus} />)}
                        {sessionData?.user?.role !== "UNDERWRITER" && (
                          <DeleteQuoteButton
                            submissionId={r.id}
                            purchased={r.purchased}
                            onDeleted={() => setResults((prev) => (prev ? prev.filter((x) => x.id !== r.id) : prev))}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pager */}
            {meta.total > 0 && meta.totalPages > 1 && (
              <div className="flex items-center justify-between mt-5">
                <p className="text-xs text-slate-400">
                  Showing{" "}
                  <span className="font-medium text-slate-600">
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, meta.total)}
                  </span>{" "}
                  of {meta.total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => runSearch(page - 1)}
                    disabled={page <= 1 || loading}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Prev
                  </button>
                  {pageWindow(page, meta.totalPages).map((pn, i) =>
                    pn === "…" ? (
                      <span key={`gap-${i}`} className="px-2 text-slate-400 text-sm">…</span>
                    ) : (
                      <button
                        key={pn}
                        type="button"
                        onClick={() => runSearch(pn as number)}
                        disabled={loading}
                        className={`min-w-[34px] px-2.5 py-1.5 rounded-lg border text-sm transition-colors ${
                          pn === page
                            ? "bg-indigo-600 border-indigo-600 text-white font-semibold"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {pn}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => runSearch(page + 1)}
                    disabled={page >= meta.totalPages || loading}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Compact page list with ellipses, e.g. 1 … 4 5 [6] 7 8 … 20
function pageWindow(current: number, totalPages: number): (number | "…")[] {
  const out: (number | "…")[] = [];
  const push = (n: number) => out.push(n);
  const lo = Math.max(2, current - 1);
  const hi = Math.min(totalPages - 1, current + 1);
  push(1);
  if (lo > 2) out.push("…");
  for (let n = lo; n <= hi; n++) push(n);
  if (hi < totalPages - 1) out.push("…");
  if (totalPages > 1) push(totalPages);
  return out;
}
