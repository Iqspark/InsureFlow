"use client";

import { useState } from "react";
import Link from "next/link";

// Hamburger menu for small screens. The desktop nav is hidden below `sm`, so
// without this there is no navigation on mobile. Server passes the resolved
// links + action-count badge.
export default function MobileNav({
  links,
  badges,
}: {
  links: { href: string; label: string }[];
  badges: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const totalBadge = Object.values(badges).reduce((sum, n) => sum + (n || 0), 0);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-200 hover:bg-white/10 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
        {!open && totalBadge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
            {totalBadge}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 top-16 z-30 bg-slate-900/40" onClick={() => setOpen(false)} />
          {/* Panel */}
          <nav className="fixed inset-x-0 top-16 z-40 bg-white border-b border-slate-200 shadow-lg p-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {l.label}
                {badges[l.href] > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {badges[l.href]}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
