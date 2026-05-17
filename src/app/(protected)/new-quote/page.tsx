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
    sub: [{ name: "Cyber Liability" }],
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
    sub: [{ name: "Contractor" }],
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
    sub: [{ name: "Architects and Engineers" }],
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
    sub: [{ name: "Jeweller Block" }, { name: "Retailers" }],
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
      { name: "Rental Homes" },
      { name: "Personal Items" },
    ],
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
    sub: [{ name: "Lithium Batteries" }],
  },
];

export default function NewQuotePage() {
  const [openId, setOpenId] = useState<string | null>("personal");

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Select a Policy Type
          </h1>
          <p className="text-slate-500 text-sm">
            Choose a category below, then pick a specific product to start the
            quoting process.
          </p>
        </div>

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
      </div>
    </div>
  );
}
