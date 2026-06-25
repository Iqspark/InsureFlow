import Link from "next/link";

const TABS = [
  { key: "overview", label: "Overview", href: "/admin" },
  { key: "brokers", label: "Brokers", href: "/admin/brokers" },
] as const;

export type AdminTab = (typeof TABS)[number]["key"];

// Route-based tab strip shared across the admin section. Each admin page passes
// its `active` key; navigation is plain links so the pages stay server-rendered.
export default function AdminTabs({ active }: { active: AdminTab }) {
  return (
    <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
      {TABS.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            className={`px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors ${
              isActive
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
