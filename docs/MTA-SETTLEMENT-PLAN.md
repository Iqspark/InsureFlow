# Mid-Term Adjustment — Engine Re-rate + Stripe Settlement (Implementation Plan)

Closes audit findings **M3 / L11**: replace the linear premium scale in the
mid-term adjustment (MTA) flow with a real rating-engine re-rate, and actually
collect/return the pro-rata premium difference for the unexpired term.

## Locked decisions
- **Coverage increases take effect on payment** — the endorsement is `pending`
  until the additional-premium Checkout is paid (confirmed by webhook).
- **Additional premium is charged via an emailed Stripe Checkout link** (on-session;
  Stripe handles SCA/3DS; no stored cards).
- **Return premium (decreases) is auto-refunded** via `stripe.refunds.create`,
  capped at the refundable balance from a transaction ledger; applies immediately.
- **Degrades cleanly** when `isStripeConfigured()` is false (record + manual), and
  is only offered for products that declare a sum-insured driver.

## Current state (what we're replacing)
- [adjust/route.ts](../src/app/api/submissions/[id]/adjust/route.ts) — owner/admin only, paid+non-cancelled
  policy; `newAnnual = round(oldAnnual × cov/oldCov)` (linear), pro-rata computed
  but **never collected** — only appended to `Submission.adjustments` (JSON) and emailed.
- One-time payment model: [buy-policy](../src/app/api/buy-policy/route.ts) → emailed pay link →
  [checkout](../src/app/api/pay/[token]/checkout/route.ts) → [webhook](../src/app/api/stripe/webhook/route.ts) →
  [finalizePaidPolicy](../src/lib/finalizePayment.ts). Single `paidAmount` / `stripePaymentIntentId` on the row.

---

## Money flow (target)

```
POST /api/submissions/[id]/adjust { coverageAmount, reason }
  │
  ├─ re-rate: product.sumInsured.apply(answers, newCov) → product.calculate()
  │     └─ decision != accept ─────────────► 409 "needs underwriter review" (no money)
  │
  ├─ proRataCents > 0  (increase)
  │     └─ create PolicyTransaction(kind=mta_charge, status=pending, payToken)
  │        → email Checkout link  → /endorsement/<payToken>
  │        → (Stripe webhook, metadata.transactionId) finalizeEndorsement():
  │             atomic pending→paid, THEN apply newCoverage/newAnnual to submission
  │
  ├─ proRataCents < 0  (decrease)
  │     └─ refundCents = min(|proRata|, refundableBalance(submission))
  │        → stripe.refunds.create({ payment_intent: lastChargePI, amount: refundCents })
  │        → PolicyTransaction(kind=mta_refund, status=refunded) → apply immediately
  │
  └─ Stripe not configured → record transaction(status=pending/manual) + email; no auto money
```

---

## Data model (Prisma — apply with `npx prisma db push`, no migration history)

```prisma
model PolicyTransaction {
  id            String   @id @default(cuid())
  submissionId  String
  submission    Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  kind          String   // "bind" | "mta_charge" | "mta_refund" | "cancellation_refund"
  amountCents   Int      // signed: + = customer owes us, − = we return to customer
  status        String   // "pending" | "paid" | "refunded" | "failed" | "manual"
  payToken      String?  @unique         // capability URL for an mta_charge pay page
  payTokenExpiresAt DateTime?
  stripeSessionId       String? @unique
  stripePaymentIntentId String?
  stripeRefundId        String?
  effectiveAt   DateTime @default(now())
  meta          Json?    // { oldCoverage,newCoverage,oldAnnual,newAnnual,remainingDays,termDays,reason }
  createdAt     DateTime @default(now())

  @@index([submissionId])
  @@index([status])
}
```

- Add `transactions PolicyTransaction[]` to `Submission`.
- Keep `Submission.adjustments` (JSON) for the human-readable timeline; the ledger
  is the source of truth for money. (Optionally derive the timeline from the ledger later.)
- **Refundable balance** = `Σ paid charges (bind + mta_charge).amountCents − Σ refunds |amountCents|`.
  For policies bound before the ledger existed, fall back to `submission.paidAmount`
  when no `bind` transaction exists.

---

## Shared building blocks

### 1. Sum-insured driver on `ProductConfig` ([products.ts](../src/data/products.ts))
```ts
sumInsured?: {
  read:  (a: Record<string,Answer>) => number;                       // current sum insured
  apply: (a: Record<string,Answer>, target: number) => Record<string,Answer>; // driver set to hit target
};
```
- **vacant-home / rental-home:** driver is `property_value`; `apply` sets
  `property_value = target / (coveragePct/100)` so `calculate()` re-applies the
  super-linear `getPropertyValueFactor` ([ratingFactors.ts](../src/data/ratingFactors.ts)). `read` returns the derived coverage.
- Products **without** `sumInsured` are not eligible for self-serve MTA (return 422
  "adjustments aren't available for this product") — avoids faking a re-rate for
  multi-value products (farm, jeweller). Add them later when the driver is well-defined.

### 2. Pro-rata helper (`src/lib/proRata.ts`, integer cents, unit-tested)
```ts
export function proRataCents(oldAnnual: number, newAnnual: number, effectiveAt: Date, expiresAt: Date, now: Date): number;
```
Single rounding policy; covers `remaining/term` clamping (the date math currently
inline in adjust/route.ts:63-70 moves here).

### 3. Ledger helpers (`src/lib/policyLedger.ts`)
```ts
recordTransaction(tx): Promise<PolicyTransaction>;
refundableBalanceCents(submissionId): Promise<number>;   // ledger, with paidAmount fallback
lastChargePaymentIntent(submissionId): Promise<string | null>; // newest paid charge PI to refund against
```

### 4. Endorsement capability URL
Reuse the token pattern: `PolicyTransaction.payToken` (UUID) + `payTokenExpiresAt`
([portalToken.ts](../src/lib/portalToken.ts) helpers). Public pages/routes:
`/endorsement/[token]` (page) and `/api/endorsement/[token]/checkout` (Stripe session) —
structurally identical to the existing pay page/route, scoped to one transaction.

---

## Phase 1 — Engine re-rate (no money movement)

**Goal:** correct premium + underwriting on adjust; settlement still recorded-only.

Changes:
1. `products.ts` — add `sumInsured` to vacant-home & rental-home; add it to `ProductConfig`.
2. `src/lib/proRata.ts` — extract pro-rata; unit tests.
3. `adjust/route.ts`:
   - Resolve product via `productSlugForPolicyType(sub.policyType)`; **422** if no `sumInsured`.
   - Parse `sub.allAnswers`; `next = sumInsured.apply(answers, newCoverage)`; `rated = calculate(next)`.
   - If `rated.decision !== "accept"` → **409** `{ needsReview: true }` (do not apply).
     (Optionally stamp `decision="refer"` + push to `/review`; decide in review.)
   - `newAnnual = rated.finalAnnualPremium`; keep the 0.25×–4× guard as a sanity bound.
   - Apply coverage/premium immediately (no settlement yet); still record to `adjustments`.

Tests:
- `proRata` rounding/edge (zero/expired/future term).
- adjust re-rate: increase yields > linear premium (property-value factor); decrease lowers it.
- out-of-appetite increase (sum insured > $3M) → 409, no DB write.
- unsupported product → 422.

**Ships independently. Pure functions, zero Stripe risk. Closes L11's rating gap.**

---

## Phase 2 — Additional-premium charge flow (increases)

**Goal:** increases require payment before coverage changes.

Changes:
1. Schema: add `PolicyTransaction` (+ relation); `prisma db push` + `prisma generate`.
2. Backfill basis: in `finalizePaidPolicy`, also `recordTransaction(kind="bind", status="paid", amountCents, stripePaymentIntentId)` so refunds (Phase 3) have a balance. (Idempotent — only on the winning claim.)
3. `adjust/route.ts` increase branch (`proRataCents > 0`):
   - Create `PolicyTransaction(kind=mta_charge, status=pending, payToken, payTokenExpiresAt, meta)`.
   - **Do not** mutate coverage yet.
   - Email the customer an endorsement Checkout link; return `{ pending: true, payUrl }`.
4. `/api/endorsement/[token]/checkout` — Stripe Checkout Session for `amountCents`,
   `metadata: { transactionId, kind: "mta_charge" }`, success/cancel → `/endorsement/<token>`.
   Mirror the [pay checkout](../src/app/api/pay/[token]/checkout/route.ts) (token lookup, expiry guard, rate limit).
5. `/endorsement/[token]` public page — shows old→new coverage + amount due + Pay button
   (or "paid"/"expired"), like [pay page](../src/app/pay/[token]/page.tsx).
6. **Webhook generalization** ([webhook/route.ts](../src/app/api/stripe/webhook/route.ts)):
   on `checkout.session.completed`, branch on `metadata.transactionId` →
   `finalizeEndorsement(transactionId, { amountTotal, paymentIntent })`; else existing
   `submissionId` → `finalizePaidPolicy`. Keep `webhookEvent` dedup.
7. `src/lib/finalizeEndorsement.ts`:
   - Atomic claim: `updateMany({ where:{ id, status:"pending" }, data:{ status:"paid", stripePaymentIntentId } })`; `count===0` → no-op (idempotent).
   - On the winning claim: apply `meta.newCoverage`/`meta.newAnnual`/monthly to the submission,
     append to `adjustments`, `recordAudit("adjusted")`, send adjustment confirmation email.

Tests:
- adjust increase → creates pending txn, no coverage change, emits payUrl.
- webhook with `transactionId` → finalizeEndorsement applies coverage; redelivery → no-op.
- endorsement checkout: expired/already-paid/invalid token guards.
- bind transaction recorded on first finalize.

---

## Phase 3 — Return premium refunds (decreases) + cancellation fold-in

**Goal:** decreases auto-refund the pro-rata, capped at refundable balance.

Changes:
1. `adjust/route.ts` decrease branch (`proRataCents < 0`) when `isStripeConfigured()`:
   - `refundCents = min(|proRata|, refundableBalanceCents(sub))`.
   - `pi = lastChargePaymentIntent(sub)`; `stripe.refunds.create({ payment_intent: pi, amount: refundCents })`.
   - `recordTransaction(kind="mta_refund", status="refunded", amountCents=-refundCents, stripeRefundId)`.
   - Apply coverage/premium **immediately**; email; if `refundCents < |proRata|`, flag the shortfall (don't silently swallow).
   - Stripe not configured → `status="manual"`, record + email, no auto money.
2. (Optional) Refactor the existing cancellation flow to emit `cancellation_refund`
   through the same ledger + refund helper, so all money movement is one code path.

Tests:
- decrease → refund created for `min(proRata, balance)`; coverage applied immediately.
- refund capped when proRata exceeds balance (+ shortfall flag).
- simulated mode → `manual` txn, no Stripe call.
- refundable-balance accounting across bind + prior mta_charge + prior refund.

---

## Invariants & edge cases (apply across phases)
- **Cents everywhere.** Stripe is integer cents; rounding lives only in `proRata`/conversion helpers.
- **Concurrency.** Use the atomic `updateMany` claim pattern (as in [finalizePaidPolicy](../src/lib/finalizePayment.ts)) for both endorsement finalize and coverage apply; reject overlapping in-flight `pending` mta_charge for the same policy.
- **Idempotency.** `webhookEvent` dedup + the per-transaction atomic claim; endorsement pay token is single-use (mark consumed on paid).
- **Sequential MTAs.** Always re-rate off the *current* stored coverage/answers; each MTA is its own ledger row.
- **Refund ceiling.** Never refund more than captured; cap at ledger balance, surface shortfalls to the broker.
- **SCA.** On-session Checkout offloads 3DS; we never do off-session charges (chosen model).
- **Expiry.** Endorsement pay links reuse `isPortalTokenExpired` (fail-closed) — same as the main pay flow.
- **Audit.** Every state change → `recordAudit` + a ledger row; the two must agree.

## Rollout / flags
- Eligibility = product has `sumInsured` **and** policy is paid + non-cancelled.
- Money paths gated by `isStripeConfigured()`; simulated mode records `manual`.
- Phase 1 is safe to ship alone; Phases 2–3 are behind the ledger schema.

## Out of scope (future)
- Off-session auto-charge (saved cards / Stripe customer vault).
- Multi-value-product MTAs (farm/jeweller) — needs a richer sum-insured model.
- Customer-initiated adjustments (today broker/admin only).
- Dunning/retry for failed endorsement payments beyond Stripe's own retries.
