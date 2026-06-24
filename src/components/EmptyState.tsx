import type { ReactNode } from "react";

// Consistent, premium empty-state card used across list pages.
export default function EmptyState({
  iconPath,
  title,
  subtitle,
  action,
}: {
  iconPath: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-4 shadow-lg shadow-indigo-200/60">
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={iconPath} />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-800 mb-1">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 max-w-xs leading-relaxed">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
