import Link from "next/link";

// Route-based sub-tab strip. Each tab is a link; the page sets `active` and an
// optional count badge. Keeps pages server-rendered.
export default function PageTabs({
  tabs,
}: {
  tabs: { label: string; href: string; active: boolean; badge?: number }[];
}) {
  return (
    <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors ${
            t.active
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          {t.label}
          {t.badge != null && t.badge > 0 && (
            <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
              t.active ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
            }`}>
              {t.badge}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
