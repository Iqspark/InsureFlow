// Net-terms + dunning configuration and date math (Phase D).
// Cover is in force at bind and the premium is a receivable, so these drive the
// invoice due date, the dunning schedule, and cancel-for-non-payment timing.

const MS_DAY = 86_400_000;

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

// Resolve the invoice term: an explicit per-policy override (incl. 0 = due on
// receipt) wins; otherwise the configured default (DEFAULT_NET_TERM_DAYS, def 30).
export function resolveNetTermDays(override?: number | null): number {
  if (typeof override === "number" && Number.isFinite(override) && override >= 0) {
    return Math.floor(override);
  }
  return envInt("DEFAULT_NET_TERM_DAYS", 30);
}

export function graceDays(): number {
  return envInt("NONPAY_GRACE_DAYS", 7);
}

export function noticeDays(): number {
  return envInt("CANCELLATION_NOTICE_DAYS", 15);
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function dueDate(boundAt: Date, termDays: number): Date {
  return addDays(boundAt, termDays);
}

// The pay link must stay valid through the invoice + the cancellation window, so
// it never dies before the customer can pay. Keeps a 30-day floor from bind.
export function payTokenExpiry(boundAt: Date, dueAt: Date): Date {
  const floor = addDays(boundAt, 30);
  const base = dueAt.getTime() > floor.getTime() ? dueAt : floor;
  return addDays(base, graceDays() + noticeDays());
}

// Pro-rata earned premium for the days on risk between effective and cancellation.
export function earnedPremium(
  annualPremium: number,
  effectiveAt: Date,
  expiresAt: Date,
  cancelledAt: Date
): number {
  const termDays = Math.max(1, Math.round((expiresAt.getTime() - effectiveAt.getTime()) / MS_DAY));
  const onRisk = Math.max(
    0,
    Math.min(termDays, Math.round((cancelledAt.getTime() - effectiveAt.getTime()) / MS_DAY))
  );
  return Math.round((annualPremium * onRisk) / termDays);
}

// Reminder stage reached for a given due date: 0 none, 1 on/after due, 2 +3, 3 +7.
export function reminderStageFor(dueAt: Date, now: Date): number {
  const days = (now.getTime() - dueAt.getTime()) / MS_DAY;
  if (days >= 7) return 3;
  if (days >= 3) return 2;
  if (days >= 0) return 1;
  return 0;
}

// A Notice of Cancellation may be issued once past due by the grace period.
export function canIssueNoticeOfCancellation(dueAt: Date, now: Date): boolean {
  return now.getTime() >= addDays(dueAt, graceDays()).getTime();
}
