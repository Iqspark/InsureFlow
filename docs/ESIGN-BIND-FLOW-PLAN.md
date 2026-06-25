# Broker/Commercial E-Sign → Bind → Pay Flow (Implementation Plan)

Reshapes the policy lifecycle to the authentic broker/commercial sequence:
**client e-signs the proposal → broker reviews and binds (issues a binder) →
premium is invoiced and paid later.** Cover is in force at **bind**, not at payment.

## Locked decisions
1. **Broker-bound, not auto-bound.** The client signs; the broker reviews the
   signed proposal and explicitly clicks **Bind**.
2. **Signature is mandatory to bind.** Binding is rejected unless the proposal is
   signed (no broker override).
3. **Full policy issued at bind; payment follows on net terms.** Right after the
   broker binds (post-signature), the **full policy document** is issued and sent —
   no separate binder. Payment is a receivable collected later. Deliberate credit
   risk: the customer holds the full contract before paying, so the
   non-payment / cancel-for-non-payment process (below) is load-bearing.

## The conceptual shift (read first)
Today payment activates the policy (`paymentStatus="paid"` = active). In this model
**bind activates cover** and **payment becomes a receivable**. Consequences:
- `effectiveAt`/`expiresAt` are set **at bind**, not at payment.
- The **full policy document is issued at bind** and is in the customer's hands
  while **in-force-and-unpaid** for the whole net term (deliberate credit risk).
- [finalizePaidPolicy](../src/lib/finalizePayment.ts) changes meaning: "premium received +
  send receipt," not "activate / issue policy" (the policy already exists).

---

## Lifecycle / state machine

`coverageStatus` (new), independent of `paymentStatus`:

```
quoted (decision=accept)
   │  broker: "Send for signature"  → issue proposalToken, email proposal link
   ▼
awaiting_signature
   │  client opens /proposal/[token], e-signs the declaration  (mandatory)
   ▼
signed                         ── PolicySignature recorded (evidence + doc hash)
   │  broker: reviews signed proposal, clicks "Bind"   [GATED: must be `signed`]
   ▼
bound (IN FORCE)               ── set effectiveAt/expiresAt; issue FULL POLICY PDF;
   │                              email policy + invoice (pay link); paymentStatus=unpaid
   │  client pays the invoice (existing /pay flow, reframed)
   ▼
bound + paymentStatus=paid     ── receipt only (policy already issued at bind)
```
- Terminal/side: `cancelled` (incl. future cancel-for-non-payment).
- **Invariant:** you cannot reach `bound` from anything but `signed`.

---

## Flow mapped to the codebase

Today [buy-policy](../src/app/api/buy-policy/route.ts) binds **and** emails the pay link in one shot.
Split it into the commercial sequence:

| Step | Trigger | Endpoint | Effect |
|------|---------|----------|--------|
| 1. Send for signature | broker (authenticated) | `POST /api/submissions/[id]/send-proposal` | issue `proposalToken`(+expiry), email proposal link, `coverageStatus=awaiting_signature` |
| 2. Sign | client (public, token) | `POST /api/proposal/[token]/sign` | capture signature + evidence, `coverageStatus=signed` |
| 3. Bind | broker (authenticated) | `POST /api/submissions/[id]/bind` | **require `signed`**; set `effectiveAt/expiresAt`, **issue full policy**, create `paymentToken`, email policy + invoice; `coverageStatus=bound` |
| 4. Pay | client (public, token) | existing `/pay/[token]` + webhook | record receipt (premium received); policy + cover already issued at bind |

Public pages (root layout, no login), reusing the `/pay` & `/portal` patterns:
- `/proposal/[token]` — review proposal + declaration + sign (capture screen).
- (existing) `/pay/[token]` — now "pay your invoice."
- (existing) `/portal/[token]` — view binder/policy, download, request changes.

---

## Documents (4 types)

| Doc | Issued at | Contents |
|-----|-----------|----------|
| **Proposal/application** | send-for-signature | quote facts + versioned declaration text; this is what's signed + hashed |
| **Policy** | **bind** | the full document ([policyPdf.tsx](../src/lib/policyPdf.tsx)), issued once bound — no separate binder |
| **Invoice** | bind | premium, `dueAt`, invoice number, pay link |
| **Receipt** | payment | confirmation the premium was received (no new policy doc) |

Built via the existing PDF stack ([policyDocument.ts](../src/lib/policyDocument.ts),
[submissionSections.ts](../src/lib/submissionSections.ts)) with new document variants. New email
senders in [email.ts](../src/lib/email.ts): proposal/sign-request, binder, invoice;
reframe confirmation/receipt for "premium received / policy issued."

---

## Data model (Prisma — `npx prisma db push`)

Submission additions:
```prisma
coverageStatus String   @default("quoted") // quoted|awaiting_signature|signed|bound|pending_cancellation|cancelled
proposalToken          String?  @unique
proposalTokenExpiresAt DateTime?
signedAt      DateTime?
boundAt       DateTime?
policyIssuedAt DateTime?
invoicedAt    DateTime?
dueAt         DateTime?
netTermDays   Int?
invoiceNumber String?
// dunning / cancel-for-non-payment
lastReminderAt        DateTime?
reminderStage         Int      @default(0)   // 0=none,1=due,2=+3,3=+7
cancellationNoticeAt    DateTime?
cancellationEffectiveAt DateTime?
cancellationReason      String?              // "non_payment" | ...
earnedPremiumOwed       Float?
// effectiveAt/expiresAt/cancelledAt already exist — effectiveAt now set at bind
```

New evidence table (non-repudiation backbone):
```prisma
model PolicySignature {
  id            String   @id @default(cuid())
  submissionId  String
  submission    Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  signerName    String
  method        String   // "typed" | "drawn"
  signatureRef  String   // typed name, or stored PNG reference/data
  declarationVersion String
  documentHash  String   // SHA-256 of the exact signed proposal bytes (or canonical JSON)
  ip            String?
  userAgent     String?
  signedAt      DateTime @default(now())
  @@index([submissionId])
}
```

---

## Broker UI deltas
- [BuyPolicyButton](../src/components/BuyPolicyButton.tsx) / [policy detail page](../src/app/(protected)/policy/[id]/page.tsx):
  replace the single "Buy This Policy" with a status-aware control:
  - `quoted` → **Send for signature**
  - `awaiting_signature` → "Awaiting client signature" (+ resend)
  - `signed` → **Review & Bind** (shows the signed proposal + evidence)
  - `bound` → "In force · invoice sent" (+ payment status badge)
- Status badges driven by `coverageStatus` × `paymentStatus`.

---

## Phasing

**Phase A — Proposal + e-signature** ✅ Implemented
- `send-proposal` endpoint + `proposalToken`; `/proposal/[token]` page with the
  signature capture screen; `sign` endpoint; `PolicySignature`; proposal PDF +
  hash; `coverageStatus awaiting_signature → signed`.
- Broker UI: Send-for-signature + "awaiting signature" state.

**Phase B — Broker review + Bind** ✅ Implemented
- `POST /api/submissions/[id]/bind` **gated on `signed`** and **re-verifies the
  signature `documentHash` matches the current proposal** (a quote edit voids it →
  409, re-send for signature); atomic `signed → bound` claim; sets
  `effectiveAt/expiresAt` + `policyIssuedAt`; **issues the full policy** (PDF
  emailed via `sendPolicyIssuedEmail`) + the pay link; underwriter notification.
- Broker UI: "Review & Bind" on signed proposals; the legacy direct-bind CTA is
  hidden once a proposal flow has started (shows only for `coverageStatus=quoted`).
- **Consolidation remaining:** the legacy direct [buy-policy](../src/app/api/buy-policy/route.ts)
  first-bind and the QuoteResult "Buy This Policy" path still allow an *unsigned*
  bind when no proposal was sent. Removing them (routing all binds through the
  signed flow) is the final step to fully enforce "signature mandatory to bind".

**Phase C — Payment reframe**
- [finalizePaidPolicy](../src/lib/finalizePayment.ts) → "premium received": send the **receipt**
  only; the policy + cover were already issued at bind (don't re-issue / re-activate).
  Pay page/email copy reframed from "activate your policy" to "pay your invoice."
- Note: until this lands, a policy bound via the e-sign flow gets the policy-issued
  email at bind AND the existing confirmation/receipt at payment (mild redundancy).

**Phase D — Net terms + dunning + cancel-for-non-payment** (see the dedicated section below).

**Deferred (decide later):**
- MTA endorsements requiring a signed change request (ties to the MTA plan).
- Joint/multiple signers.
- Earned-premium **billing/collection** on a non-payment cancel (the amount is
  recorded; collection folds into the MTA ledger).

---

## Phase D — Net terms & cancel-for-non-payment

Because the full policy is in force and unpaid for the net term, this is the safety
valve. **Locked defaults:** net-30 (+ per-policy override), 7-day grace before a
Notice of Cancellation may be issued, 15-day notice period, broker-issued NoC +
auto-cancel on the effective date, auto-reinstate if paid in the window, earned
premium recorded (billing deferred), reminders on due / +3 / +7.

### Config (env; per-policy override at bind)
```
DEFAULT_NET_TERM_DAYS=30      # invoice term
NONPAY_GRACE_DAYS=7           # past-due days before a NoC may be issued
CANCELLATION_NOTICE_DAYS=15   # statutory notice window before cancellation takes effect
JOBS_SECRET=<random>          # auth for the scheduled dunning job
```
- Broker may override the term at bind: **Due-on-receipt (0) / 15 / 30**. The
  resolved value is stored as `netTermDays` and `dueAt = boundAt + netTermDays`
  is stamped on the row (immune to later config changes).

### Token reconciliation (don't let the pay link die before it's due)
Set `paymentTokenExpiresAt = max(dueAt, boundAt + 30d) + NONPAY_GRACE_DAYS +
CANCELLATION_NOTICE_DAYS`, so the customer can always pay right through the
cancellation window. (Today it's a flat 30 days from bind — that would expire
mid-term for net-30.)

### Lifecycle
```
bound + unpaid
  ├─ reminders on due / +3 / +7 (reminderStage, lastReminderAt)
  └─ now ≥ dueAt + NONPAY_GRACE_DAYS, still unpaid → broker may issue NoC
broker: "Issue Notice of Cancellation"
  └─► pending_cancellation
        cancellationNoticeAt = now
        cancellationEffectiveAt = now + CANCELLATION_NOTICE_DAYS
        (cover STILL in force during the window) → email NoC
  ├─ paid before effective date ──► reinstated → bound (clear cancellation fields) → email reinstatement
  └─ effective date reached, still unpaid ──► cancelled (reason=non_payment, cancelledAt=effective)
        earnedPremiumOwed recorded → email cancellation
```

### Scheduled job — `POST /api/jobs/dunning`
- Auth: `x-jobs-secret: $JOBS_SECRET` (constant-time compare); 401 otherwise.
- Cadence: daily, via an external scheduler (Azure timer/WebJob, a GitHub Actions
  `schedule`, or a cron service). **Idempotent** — safe to run twice.
- Each run:
  1. **Reminders** — bound+unpaid: send the due/+3/+7 reminder not yet sent; advance
     `reminderStage`, set `lastReminderAt`. One email per stage (stage guard).
  2. **Auto-cancel** — `pending_cancellation` where `now ≥ cancellationEffectiveAt`
     and still unpaid → atomic claim → cancel (reason `non_payment`,
     `cancelledAt = cancellationEffectiveAt`), compute earned premium, email cancellation.

### Broker NoC endpoint — `POST /api/submissions/[id]/notice-of-cancellation`
Authenticated (owner/admin via `canBindOrPay`); requires `bound` + unpaid +
`now ≥ dueAt + NONPAY_GRACE_DAYS`. Sets `pending_cancellation`, stamps notice +
effective dates, emails the NoC, writes an audit event.

### Reinstatement
In the payment finalize path: if the policy is `pending_cancellation` and
`now < cancellationEffectiveAt`, clear back to `bound`, null the cancellation
fields, email reinstatement, audit. **Paid after the effective date does not
auto-reinstate** (already cancelled — that's a manual rewrite/new-policy decision).

### Earned premium (recorded; billing deferred)
On non-payment cancel:
`earnedPremiumOwed = round(annualPremium × daysOnRisk / termDays)`,
`daysOnRisk = cancelledAt − effectiveAt`. Stored + surfaced as an outstanding
receivable; actual collection is deferred and folds into the MTA ledger.

### Emails
- New: payment reminder, Notice of Cancellation, reinstatement.
- Reused: [sendCancellationEmail](../src/lib/email.ts) with `reason="non-payment"`.

### Test matrix (Phase D)
- Term resolves + `dueAt` stamped at bind; per-policy override + due-on-receipt(0).
- `paymentTokenExpiresAt` ≥ dueAt + grace + notice window.
- Reminders fire once per stage; re-running the job sends no duplicates.
- NoC endpoint rejected before `dueAt + grace`; sets pending_cancellation + dates.
- Auto-cancel only at/after the effective date while unpaid; idempotent under re-run.
- Payment during the notice window → reinstated; payment after effective → no auto-reinstate.
- Earned-premium math across a partial term.

## Security (reuses the audit-hardening patterns)
- `/proposal/[token]` routes: **fail-closed token expiry**
  ([isPortalTokenExpired](../src/lib/portalToken.ts)), rate limit, audit — same as
  [portal request](../src/app/api/portal/[token]/request/route.ts).
- **Phase-scoped tokens:** `proposalToken` (sign) is separate from `paymentToken`
  (pay), so the sign link can't be used to pay and vice versa, and each is
  independently expirable/revocable.
- Signature input: validate method, **cap the signature payload size** (drawn PNG
  data-URLs are large), strip control chars from typed names.
- **Idempotency:** signing an already-signed proposal is a no-op; binding a
  non-`signed` row is rejected; concurrent bind uses an atomic `updateMany` claim.
- Capture evidence server-side (IP/UA/timestamp/doc hash) — never trust a
  client-asserted signer identity beyond the token's scope.

## Critical edge case — quote changes after signing
A signature is bound to the **document hash**. If the broker edits the quote after
the client signed (premium/coverage/answers change), the signature is **void**:
reset `coverageStatus` to `quoted`, clear `signedAt`/signature, and require a fresh
send-for-signature. Bind must re-verify the signed doc hash matches the current
proposal before issuing the binder.

## Test matrix
- A: send-proposal issues token + sets awaiting_signature; sign captures evidence
  + hash; expired/used token → 410; already-signed → no-op; oversized signature → 413.
- B: bind rejected when not `signed` (409); bind sets effectiveAt + **issues the
  full policy** + invoice; hash-mismatch (quote changed) → blocked; concurrent bind
  → single winner.
- C: payment sends a receipt only (no new policy doc); in-force state unchanged by
  payment; simulated (no-Stripe) path still completes.
