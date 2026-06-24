export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submissionScopeWhere, type SessionUser } from "@/lib/access";
import CustomerCard from "@/components/CustomerCard";
import CustomerSearchBox from "@/components/CustomerSearchBox";
import EmptyState from "@/components/EmptyState";
import { policyNumber } from "@/utils/policyNumber";

const cad = (v: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });

type Sub = {
  id: string;
  createdAt: Date;
  applicantName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  policyType: string;
  decision: string | null;
  status: string;
  purchased: boolean;
  paymentStatus: string;
  annualPremium: number | null;
  effectiveAt: Date | null;
  expiresAt: Date | null;
  paidAt: Date | null;
  cancelledAt: Date | null;
};

type Customer = {
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  subs: Sub[];
  policies: number;
  quotes: number;
  underReview: number;
  totalPremium: number;
  nextRenewal: Date | null;
};

const derivedExpiry = (s: Sub): Date => {
  if (s.expiresAt) return new Date(s.expiresAt);
  const base = new Date(s.paidAt ?? s.createdAt);
  base.setFullYear(base.getFullYear() + 1);
  return base;
};

const PAGE_SIZE = 10;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user as unknown as SessionUser;

  const q = (searchParams.q ?? "").trim();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    ...submissionScopeWhere(user),
    ...(q
      ? {
          OR: [
            { applicantName: { contains: q, mode: "insensitive" } },
            { contactEmail: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const subs = (await prisma.submission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 2000,
    select: {
      id: true, createdAt: true, applicantName: true, contactEmail: true, contactPhone: true,
      policyType: true, decision: true, status: true, purchased: true, paymentStatus: true,
      annualPremium: true, effectiveAt: true, expiresAt: true, paidAt: true, cancelledAt: true,
    },
  })) as Sub[];

  // Group into customers by email (fallback to name).
  const map = new Map<string, Customer>();
  for (const s of subs) {
    const key = (s.contactEmail ?? s.applicantName ?? "unknown").toLowerCase().trim();
    let c = map.get(key);
    if (!c) {
      c = {
        key, name: s.applicantName ?? s.contactEmail ?? "Unknown",
        email: s.contactEmail, phone: s.contactPhone,
        subs: [], policies: 0, quotes: 0, underReview: 0, totalPremium: 0, nextRenewal: null,
      };
      map.set(key, c);
    }
    c.subs.push(s);
    if (s.purchased && !s.cancelledAt) {
      // Active policy — counts toward premium and renewal.
      c.policies += 1;
      c.totalPremium += s.annualPremium ?? 0;
      const exp = derivedExpiry(s);
      if (!c.nextRenewal || exp < c.nextRenewal) c.nextRenewal = exp;
    } else if (!s.purchased) {
      // Referred submissions are under review, not quotes.
      if (s.decision === "refer") c.underReview += 1;
      else c.quotes += 1;
    }
    if (!c.phone && s.contactPhone) c.phone = s.contactPhone;
  }

  const customers = Array.from(map.values()).sort((a, b) => b.totalPremium - a.totalPremium);
  const now = new Date();

  const page = Math.max(1, Number(searchParams.page ?? 1));
  const totalPages = Math.max(1, Math.ceil(customers.length / PAGE_SIZE));
  const paged = customers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageHref = (n: number) =>
    `/customers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(n) }).toString()}`;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Customers</h1>
          <p className="text-slate-500 text-sm">
            Look up a customer to see their policies, premium, and renewals.
          </p>
        </div>

        {/* Typeahead lookup — suggests customers by name or email */}
        <CustomerSearchBox initialValue={q} />

        {customers.length === 0 ? (
          <EmptyState
            iconPath="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            title="No customers found"
            subtitle={q ? "No customer matches that name or email — try a different search." : "Customers appear here automatically as you create quotes and bind policies."}
          />
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-3">
              {customers.length} customer{customers.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-4">
              {paged.map((c) => (
                <CustomerCard
                  key={c.key}
                  name={c.name}
                  email={c.email}
                  phone={c.phone}
                  policies={c.policies}
                  quotes={c.quotes}
                  underReview={c.underReview}
                  premiumLabel={cad(c.totalPremium)}
                  nextRenewalLabel={c.nextRenewal ? fmtDate(c.nextRenewal) : "—"}
                  rows={c.subs.map((s: Sub) => {
                    const renewal = s.purchased && !s.cancelledAt ? derivedExpiry(s) : null;
                    return {
                      id: s.id,
                      policyType: s.policyType,
                      appId: policyNumber(s),
                      premiumLabel: s.annualPremium != null ? cad(s.annualPremium) : null,
                      renewalLabel: renewal ? fmtDate(renewal) : null,
                      renewalDays: renewal
                        ? Math.round((renewal.getTime() - now.getTime()) / 86_400_000)
                        : null,
                      purchased: s.purchased,
                      paymentStatus: s.paymentStatus,
                      isDraft: s.status === "draft",
                      cancelled: !!s.cancelledAt,
                      decision: s.decision,
                    };
                  })}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-5">
                <p className="text-xs text-slate-400">
                  Showing{" "}
                  <span className="font-medium text-slate-600">
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, customers.length)}
                  </span>{" "}
                  of {customers.length}
                </p>
                <div className="flex items-center gap-1">
                  {page > 1 ? (
                    <Link href={pageHref(page - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 transition-colors">← Prev</Link>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-300 cursor-not-allowed">← Prev</span>
                  )}
                  <span className="px-3 py-1.5 text-sm text-slate-500">Page {page} of {totalPages}</span>
                  {page < totalPages ? (
                    <Link href={pageHref(page + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 transition-colors">Next →</Link>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-300 cursor-not-allowed">Next →</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
