import Link from "next/link";
import type { RangeKey } from "@/lib/brokerStats";

const TABS: { key: RangeKey; label: string }[] = [
  { key: "30", label: "30d" },
  { key: "90", label: "90d" },
  { key: "all", label: "All" },
];

// Time-window selector rendered as links (works in server components).
export default function RangeTabs({ basePath, current }: { basePath: string; current: RangeKey }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs">
      {TABS.map((t) => {
        const active = t.key === current;
        return (
          <Link
            key={t.key}
            href={`${basePath}?range=${t.key}`}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              active ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
