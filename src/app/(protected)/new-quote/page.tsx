"use client";

import { useState } from "react";
import Link from "next/link";

type SubCategory = {
  name: string;
  href?: string; // if undefined → coming soon
};

type Category = {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  sub: SubCategory[];
};

const CATEGORIES: Category[] = [
  {
    id: "cyber",
    name: "Cyber",
    color: "bg-violet-100 text-violet-700 border-violet-200",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    sub: [{ name: "Cyber Liability", href: "/new-quote/cyber-liability" }],
  },
  {
    id: "construction",
    name: "Construction",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    sub: [{ name: "Contractor", href: "/new-quote/contractor" }],
  },
  {
    id: "professional",
    name: "Professional",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    sub: [{ name: "Architects and Engineers", href: "/new-quote/architects-engineers" }],
  },
  {
    id: "commercial",
    name: "Commercial",
    color: "bg-teal-100 text-teal-700 border-teal-200",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    sub: [{ name: "Jeweller Block", href: "/new-quote/jeweller-block" }, { name: "Retailers", href: "/new-quote/retailers" }],
  },
  {
    id: "personal",
    name: "Personal",
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    sub: [
      { name: "Vacant Homes", href: "/new-quote/vacant-home" },
      { name: "Rental Homes", href: "/new-quote/rental-home" },
      { name: "Personal Items", href: "/new-quote/personal-items" },
    ],
  },
  {
    id: "agriculture",
    name: "Agriculture",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4a4 4 0 014-4h0a4 4 0 014 4v4M11 21v-6a5 5 0 015-5h0a5 5 0 015 5v6M3 21h18M7 9a2 2 0 100-4 2 2 0 000 4z" />
      </svg>
    ),
    sub: [{ name: "Farm Insurance", href: "/new-quote/farm" }],
  },
  {
    id: "manufacturing",
    name: "Manufacturing / Product",
    color: "bg-rose-100 text-rose-700 border-rose-200",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    sub: [{ name: "Lithium Batteries", href: "/new-quote/lithium-batteries" }],
  },
];

// Flat list of every product (with its category) for the search box.
const ALL_PRODUCTS = CATEGORIES.flatMap((cat) =>
  cat.sub.map((sub) => ({ ...sub, category: cat.name }))
);

export default function NewQuotePage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const matches = q
    ? ALL_PRODUCTS.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      )
    : [];

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/50">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Select a Policy Type
          </h1>
          <p className="text-slate-500 text-sm">
            Search for a product, or choose a category below to start the
            quoting process.
          </p>
        </div>

        {/* Search box — filters all products */}
        <div className="relative mb-4">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search policies — e.g. farm, cyber, jeweller…"
            className="w-full pl-11 pr-10 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Search results — replace the accordion while searching */}
        {q ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {matches.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-400 text-center">
                No policies match “{query}”.
              </p>
            ) : (
              matches.map((p) =>
                p.href ? (
                  <Link
                    key={p.name}
                    href={p.href}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-indigo-50 transition-colors group"
                  >
                    <span className="min-w-0">
                      <span className="text-sm text-slate-700 group-hover:text-indigo-700 font-medium block truncate">
                        {p.name}
                      </span>
                      <span className="text-xs text-slate-400">{p.category}</span>
                    </span>
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 group-hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-full shrink-0">
                      Start Quote
                    </span>
                  </Link>
                ) : (
                  <div key={p.name} className="flex items-center justify-between px-5 py-3.5">
                    <span className="min-w-0">
                      <span className="text-sm text-slate-400 block truncate">{p.name}</span>
                      <span className="text-xs text-slate-300">{p.category}</span>
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full shrink-0">
                      Coming Soon
                    </span>
                  </div>
                )
              )
            )}
          </div>
        ) : (
        <div className="space-y-3">
          {CATEGORIES.map((cat) => {
            const isOpen = openId === cat.id;
            return (
              <div
                key={cat.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Category header */}
                <button
                  onClick={() => setOpenId(isOpen ? null : cat.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${cat.color}`}>
                    {cat.icon}
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-slate-900 text-sm sm:text-base">
                      {cat.name}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      {cat.sub.length} product{cat.sub.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Subcategories */}
                {isOpen && (
                  <div className="border-t border-slate-100 divide-y divide-slate-100">
                    {cat.sub.map((sub) =>
                      sub.href ? (
                        <Link
                          key={sub.name}
                          href={sub.href}
                          className="flex items-center justify-between px-5 py-3.5 hover:bg-indigo-50 transition-colors group"
                        >
                          <span className="text-sm text-slate-700 group-hover:text-indigo-700 font-medium pl-14">
                            {sub.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 group-hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-full">
                              Start Quote
                            </span>
                            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </Link>
                      ) : (
                        <div
                          key={sub.name}
                          className="flex items-center justify-between px-5 py-3.5"
                        >
                          <span className="text-sm text-slate-400 pl-14">
                            {sub.name}
                          </span>
                          <span className="text-xs text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                            Coming Soon
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
