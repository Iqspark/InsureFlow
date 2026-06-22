"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Suggestion = {
  id: string;
  appId: string;
  applicantName: string | null;
  policyType: string;
  decision: string | null;
};

function badge(decision: string | null) {
  if (decision === "accept") return { text: "Approved", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  if (decision === "decline") return { text: "Declined", cls: "text-red-700 bg-red-50 border-red-200" };
  return { text: "Pending", cls: "text-amber-700 bg-amber-50 border-amber-200" };
}

// Reusable typeahead over submissions. `endpoint` returns suggestions;
// selecting opens the policy, Enter/Search filters the list at `basePath`.
export default function SubmissionSearchBox({
  endpoint,
  basePath,
  placeholder,
  initialValue = "",
}: {
  endpoint: string;
  basePath: string;
  placeholder: string;
  initialValue?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 1) { setItems([]); setOpen(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setItems(data.data ?? []);
        setOpen(true);
        setActive(-1);
      } catch { setItems([]); } finally { setLoading(false); }
    }, 180);
    return () => clearTimeout(t);
  }, [value, endpoint]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function filterList() {
    const q = value.trim();
    router.push(q ? `${basePath}?q=${encodeURIComponent(q)}` : basePath);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || items.length === 0) {
      if (e.key === "Enter") { e.preventDefault(); filterList(); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && items[active]) router.push(`/policy/${items[active].id}`);
      else filterList();
    } else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div className="flex gap-2 mb-6">
      <div ref={boxRef} className="relative flex-1">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => value.trim() && items.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-9 py-2.5 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition"
        />
        {value && (
          <button
            type="button"
            onClick={() => { setValue(""); setItems([]); setOpen(false); router.push(basePath); }}
            aria-label="Clear"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {open && (
          <div className="absolute z-20 mt-1.5 w-full bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
            {loading && items.length === 0 ? (
              <p className="px-4 py-3 text-xs text-slate-400">Searching…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-3 text-xs text-slate-400">No matches.</p>
            ) : (
              items.map((s, i) => {
                const b = badge(s.decision);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => router.push(`/policy/${s.id}`)}
                    className={`w-full text-left flex items-center justify-between gap-3 px-4 py-2.5 transition-colors ${i === active ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800 truncate">{s.applicantName ?? "—"}</span>
                      <span className="block text-xs text-slate-400">
                        {s.policyType} <span className="mx-1 text-slate-300">·</span>
                        <span className="font-mono">{s.appId}</span>
                      </span>
                    </span>
                    <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${b.cls}`}>
                      {b.text}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
      <button type="button" onClick={filterList} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm transition-colors">
        Search
      </button>
    </div>
  );
}
