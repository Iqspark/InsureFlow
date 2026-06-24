"use client";

// Downloads a role-scoped CSV from /api/submissions/export. Optional filters
// mirror the search page (name, appId, date, policyType).
export default function ExportCsvButton({
  params,
  label = "Export CSV",
}: {
  params?: Record<string, string>;
  label?: string;
}) {
  const qs = new URLSearchParams(
    Object.entries(params ?? {}).filter(([, v]) => v)
  ).toString();
  const href = `/api/submissions/export${qs ? `?${qs}` : ""}`;

  return (
    <a
      href={href}
      className="flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors border border-slate-200 shadow-xs text-sm"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
      </svg>
      {label}
    </a>
  );
}
