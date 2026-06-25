// Per-broker performance metrics, computed from a list of submissions.
// Shared by the broker performance table and the per-broker detail page.

export type SubLite = {
  decision: string | null;
  status: string;
  purchased: boolean;
  paymentStatus: string;
  cancelledAt: Date | null;
  annualPremium: number | null;
  paidAmount: number | null;
};

export type BrokerMetrics = {
  quotes: number;        // all submissions (incl. drafts)
  completed: number;     // status !== "draft"
  accepted: number;
  declined: number;
  referred: number;
  bound: number;         // purchased
  paid: number;          // paymentStatus === "paid"
  pendingCount: number;  // bound, unpaid, not cancelled
  pendingValue: number;  // $ of those pending payments
  cancelled: number;
  premiumBound: number;
  premiumPaid: number;
};

export function emptyMetrics(): BrokerMetrics {
  return {
    quotes: 0, completed: 0, accepted: 0, declined: 0, referred: 0,
    bound: 0, paid: 0, pendingCount: 0, pendingValue: 0, cancelled: 0,
    premiumBound: 0, premiumPaid: 0,
  };
}

export function computeBrokerMetrics(subs: SubLite[]): BrokerMetrics {
  const m = emptyMetrics();
  for (const s of subs) {
    m.quotes++;
    if (s.status !== "draft") m.completed++;
    if (s.decision === "accept") m.accepted++;
    else if (s.decision === "decline") m.declined++;
    else if (s.decision === "refer") m.referred++;
    if (s.purchased) {
      m.bound++;
      m.premiumBound += s.annualPremium ?? 0;
    }
    if (s.paymentStatus === "paid") {
      m.paid++;
      m.premiumPaid += s.paidAmount ?? s.annualPremium ?? 0;
    }
    if (s.purchased && s.paymentStatus !== "paid" && !s.cancelledAt) {
      m.pendingCount++;
      m.pendingValue += s.annualPremium ?? 0;
    }
    if (s.cancelledAt) m.cancelled++;
  }
  return m;
}

export const pctRate = (num: number, den: number) =>
  den > 0 ? Math.round((num / den) * 100) : 0;

export type RangeKey = "30" | "90" | "all";

export function normalizeRange(v: string | undefined): RangeKey {
  return v === "30" || v === "90" ? v : "all";
}

// Cutoff Date for a range, or null for "all". `now` is injected so callers
// control the clock (server pages pass new Date()).
export function rangeCutoff(range: RangeKey, now: Date): Date | null {
  if (range === "all") return null;
  const d = new Date(now);
  d.setDate(d.getDate() - Number(range));
  return d;
}

export const RANGE_LABEL: Record<RangeKey, string> = {
  "30": "Last 30 days",
  "90": "Last 90 days",
  all: "All time",
};
