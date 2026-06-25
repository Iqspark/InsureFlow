# InsureFlow — Security Audit

White-box review of the broker portal. Methodology: 10-dimension multi-agent
audit with adversarial verification (every finding re-checked against source),
plus manual corroboration of the money/auth paths. Severities reflect the
verified (adjusted) rating, not the initial raise.

**Status legend:** ✅ Fixed · ⬜ Open (backlog)

---

## ✅ Fixed (Critical + High)

| ID | Severity | Title | Fix |
|----|----------|-------|-----|
| C1 | Critical | Client-controlled premium & underwriting decision on `POST /api/submissions` | Server recomputes decision/premium from `answers` via the product calculator; client values ignored; route now requires auth |
| C2 | Critical | Write-side IDOR via unscoped `draftId` (`/api/submissions`, `/api/drafts`) | `updateMany` scoped to `{ id, brokerId, status:"draft" }`; both POSTs require a session |
| H1 | High | `GET /api/analytics` fully unauthenticated (all-broker PII) | Now requires an authenticated **ADMIN** session |
| H2 | High | Prod re-seeds public demo creds + one-tap admin login on live page | Seeding gated behind `ALLOW_DEMO_SEED`; demo login UI gated behind `NEXT_PUBLIC_ENABLE_DEMO`; CI no longer seeds unless the secret is set |
| H3 | High | Pay routes skip token-expiry check (expired links still charge) | `isPortalTokenExpired` enforced on `/api/pay/[token]`, `/checkout`, and the `/pay/[token]` page |
| H4 | High | Deactivated/demoted users keep a valid JWT for up to 8h | `jwt` callback re-validates `active`/`role` against the DB each request; `session` drops the user when deactivated; middleware + protected layout updated |

Notes:
- C1's server recompute is the load-bearing control — it also closes the
  "self-approve a referred/declined quote" and "bind at an arbitrary premium"
  business-logic breaks, because binding trusts the stored `decision`/premium.
- H2's secure default is **off**: a normal deployment that doesn't set the two
  env flags gets no demo accounts and no demo login buttons. The demo site must
  opt in via `ALLOW_DEMO_SEED=true` (CI secret) and `NEXT_PUBLIC_ENABLE_DEMO=true`
  (build env).

---

## ✅ Fixed (Medium / Low / Info — second pass)

All remediated and covered by `tsc --noEmit` + the test suite (154 passing).

### Medium
- **M1 — Host-header injection in `publicBaseUrl`** · [baseUrl.ts](src/lib/baseUrl.ts) — header-derived origin now validated against `PUBLIC_HOST_ALLOWLIST`; a pinned non-localhost `NEXTAUTH_URL` (required in prod) remains the primary defense. Tests added.
- **M2 — Email HTML injection** · [email.ts](src/lib/email.ts) — added a shared `esc()` helper applied to every attacker-controlled field (`applicantName`/`brokerName`/`policyType`/`reviewNote`/`reason`/`appId`/emails) across all templates.
- **M3 — Adjust-route premium rewrite** · [adjust/route.ts](src/app/api/submissions/[id]/adjust/route.ts) — coverage bounded to 0.25×–4× of the original; out-of-band changes must go through a new quote (blocks premium-zeroing / absurd inflation). *Partial:* full engine re-rate + Stripe delta settlement is a larger product change (see L11).
- **M4 — Token leaked via Referer** · [PropertyMap.tsx](src/components/PropertyMap.tsx) — `referrerPolicy="no-referrer"` + global `Referrer-Policy: no-referrer` header (L10).
- **M5 — AI-route DoS** · [help-chat](src/app/api/help-chat/route.ts), [chat-intent](src/app/api/chat-intent/route.ts) — per-user rate limit, capped message/history/questions, try/catch on JSON.
- **M6 — PWA cache on logout** · [SignOutButton.tsx](src/components/SignOutButton.tsx) — purges Cache Storage and unregisters the SW before sign-out. *Optional follow-up:* exclude `/api/*` from `next-pwa` runtime caching.
- **M7 — Login brute-force** · [auth.ts](src/lib/auth.ts) — per-account (10/5min) + per-IP (50/5min) throttle in `authorize`, fails closed with no lockout oracle.

### Low
- **L1 — buy-policy resend spam** · [buy-policy](src/app/api/buy-policy/route.ts) — 5/min cooldown keyed by submissionId.
- **L2 — XFF spoofing** · [rateLimit.ts](src/lib/rateLimit.ts) — `clientIp` honors `TRUSTED_PROXY_HOP_COUNT`; portal-request also limited per-token.
- **L3 — Legacy null-expiry tokens** · [portalToken.ts](src/lib/portalToken.ts) — now fail-closed (null = expired); re-sending the link stamps a fresh window. Test updated.
- **L4 — `SESSION_VERSION` scope** — superseded by the H4 per-request DB re-validation (`active`/`role`).
- **L5 — finalize TOCTOU** · [finalizePayment.ts](src/lib/finalizePayment.ts) — atomic `updateMany({ where:{ id, paymentStatus:{ not:"paid" } } })`; emails gated on the winning claim. Test added.
- **L6 — AI underwriter prompt injection** · [aiUnderwriter.ts](src/lib/aiUnderwriter.ts) — untrusted data fenced in `<APPLICATION_DATA>` with a system-prompt directive to never follow embedded instructions.
- **L7 — help-chat role injection** · history filtered to `user`/`assistant` only.
- **L8 — help-chat PII logging** · message/reply logs gated to non-production (and only lengths logged).
- **L9 — Unbounded body** · 100 KB cap on `answers` in submissions + drafts (413).
- **L10 — Security headers** · [next.config.js](next.config.js) — `headers()` adds `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, HSTS, `Permissions-Policy` (works on Azure standalone, unlike `vercel.json`).
- **L11 — Adjust linear re-pricing** — mitigated by the M3 coverage band; full engine re-rate remains a product enhancement.

### Info
- **I1 — policy document check** · [policy/[id]/document](src/app/api/policy/[id]/document/route.ts) — now uses `canViewSubmission`.
- **I2 — Admin field bounds** · [admin/users](src/app/api/admin/users/route.ts) — name/email/licence/password length-bounded + email format check.
- **I3 — Webhook amount mismatch** · [webhook](src/app/api/stripe/webhook/route.ts) + [finalizePayment.ts](src/lib/finalizePayment.ts) — records the actual Stripe-captured `amount_total` as `paidAmount`.

### Remaining (explicitly deferred, not security-blocking)
- M3/L11 full rating-engine re-rate + Stripe pro-rata settlement on mid-term adjustments.
- M6 `next-pwa` runtime-cache exclusion of `/api/*` (logout purge already mitigates the disclosure).

---

## Verified NOT vulnerable (checked, no action)

SQL injection (all Prisma, no raw queries) · path traversal (knowledge loader
uses a fixed dir, no user input in paths) · SSRF (Google map host hardcoded,
address `encodeURIComponent`'d) · open redirect (all `redirect()` targets
static) · CSRF (SameSite=Lax + `req.json()` content-type rejection) · admin
user-management guards (role allowlist, last-admin protection, self-deactivation
block) · Stripe webhook signature verification + event dedup · `review` /
`drafts/[id]` / `customers/suggest` / `DELETE submissions` ownership scoping.
