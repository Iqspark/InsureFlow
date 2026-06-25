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

## ⬜ Open — backlog (Medium / Low / Info)

Ranked by adjusted severity. Each item is independently actionable.

### Medium

- **M1 — Host-header injection in `publicBaseUrl`** · `src/lib/baseUrl.ts:14-28`
  When `NEXTAUTH_URL` is unset/localhost, emailed pay-links and Stripe
  success/cancel URLs are built from `X-Forwarded-Host`/`Host`. A forged host →
  `https://attacker.com/pay/<token>` (token exfiltration / in-brand phishing).
  *Fix:* require a pinned non-localhost `NEXTAUTH_URL` in prod; never derive
  email links from request headers (or validate host against an allowlist).

- **M2 — HTML injection into outbound emails** · `src/lib/email.ts` (only `message` is escaped)
  `applicantName`/`brokerName`/`reviewNote`/`reason`/`policyType` are
  interpolated raw into HTML. `applicantName` is attacker-controlled and reaches
  the broker inbox **unauthenticated** via `POST /api/portal/[token]/request`.
  *Fix:* one `htmlEscape` helper applied to every interpolated field in all templates.

- **M3 — Broker rewrites a paid policy's premium via adjust route** · `src/app/api/submissions/[id]/adjust/route.ts:46-90`
  Linear rescale with no bounds, no re-rating, no underwriting re-check, and the
  pro-rata delta is never charged/refunded. `coverageAmount:1` ≈ zeroes premium.
  *Fix:* re-rate through the engine; require approval for material changes;
  settle the delta via Stripe; cap coverage to product limits.

- **M4 — Pay/portal token leaked to Google via Referer** · `src/components/PropertyMap.tsx:23-30`
  `referrerPolicy="no-referrer-when-downgrade"` ships the full `/portal/<token>`
  path to Google in the map-iframe Referer.
  *Fix:* `referrerPolicy="no-referrer"` + a strict `Referrer-Policy` header on `/pay` & `/portal`.

- **M5 — AI chat endpoints: no rate limit + unbounded input** · `src/app/api/help-chat/route.ts:94-125`, `src/app/api/chat-intent/route.ts`
  Unbounded `history`/`questions` to gpt-4o-mini + per-call KB PDF re-parse →
  OpenAI cost amplification / DoS. `chat-intent` 500s on malformed body.
  *Fix:* `tooMany()` keyed by user id; cap history/length; cache the KB; wrap `req.json()` in try/catch.

- **M6 — PWA service worker caches authenticated PII, never cleared on logout** · `public/sw.js`, `src/components/SignOutButton.tsx`
  NetworkFirst caches `/api/*` and authed pages; sign-out doesn't purge caches →
  next user on a shared device reads prior broker's customer PII.
  *Fix:* clear caches + unregister SW on sign-out; exclude PII routes from runtime caching; `Cache-Control: no-store` on PII responses.

- **M7 — No brute-force protection on login** · `src/lib/auth.ts:14-35`
  No lockout/throttle on the credentials callback → unthrottled credential stuffing.
  *Fix:* per-IP + per-account throttle (reuse `src/lib/rateLimit.ts`) and lockout state.

### Low

- **L1 — `buy-policy` has no resend rate limit** · `src/app/api/buy-policy/route.ts` — applicant email-bombing + indefinite token-expiry refresh. *Fix:* cooldown keyed by submissionId.
- **L2 — Rate limiter bypassable via spoofed `X-Forwarded-For`** · `src/lib/rateLimit.ts:38-41` — take a trusted-proxy hop, not the leftmost client value; consider per-token caps.
- **L3 — Legacy null-expiry tokens never expire** · `src/lib/portalToken.ts:14` — backfill `paymentTokenExpiresAt`; treat null as expired (fail-closed).
- **L4 — `SESSION_VERSION` only covers 3 route prefixes, not tied to user state** · `src/middleware.ts` — fold into the H4 per-user re-validation.
- **L5 — `finalizePaidPolicy` check-then-update TOCTOU** · `src/lib/finalizePayment.ts:24-48` — use atomic `updateMany({ where:{ id, paymentStatus:{ not:"paid" } } })`; gate emails on `count===1`.
- **L6 — Prompt injection into the advisory AI underwriter recommendation** · `src/lib/aiUnderwriter.ts:67-130` — delimit untrusted answer text as data; keep verdict advisory (already is).
- **L7 — `help-chat` trusts client-supplied message `role`** · `src/app/api/help-chat/route.ts:122` — filter `history` roles to `user`/`assistant`.
- **L8 — `help-chat` logs full user messages/replies** · `src/app/api/help-chat/route.ts:115,128` — drop or gate behind `NODE_ENV!=="production"`.
- **L9 — Unbounded `allAnswers` blob / no body-size limit** · `src/app/api/submissions/route.ts`, `src/app/api/drafts/route.ts` — cap body size; validate `answers` shape with zod.
- **L10 — Security headers configured only in `vercel.json` but deploy target is Azure** — `next.config.js` `output:"standalone"` on Azure ignores `vercel.json`, so `X-Frame-Options`/CSP/HSTS are likely absent in prod. *Fix:* add a `headers()` block in `next.config.js`.
- **L11 — Mid-term adjust uses naive linear re-pricing** · `src/app/api/submissions/[id]/adjust/route.ts:60` — re-run the rating + underwriting engine (overlaps M3).

### Info

- **I1 — `policy/[id]/document` uses an ad-hoc owner check instead of `canViewSubmission`** · stricter than the helper (admins/underwriters get 404), not a leak. Align with the helper for consistency.
- **I2 — Admin user create/update fields not length-bounded** · `src/app/api/admin/users/route.ts` — add max-length validation (the important RBAC guards are present).
- **I3 — Stripe webhook honors a confirmed payment on amount mismatch** · `src/app/api/stripe/webhook/route.ts:62-76` — data-integrity only (records expected, not captured, amount). Record `amount_total` as `paidAmount`, or hold for manual review.

---

## Verified NOT vulnerable (checked, no action)

SQL injection (all Prisma, no raw queries) · path traversal (knowledge loader
uses a fixed dir, no user input in paths) · SSRF (Google map host hardcoded,
address `encodeURIComponent`'d) · open redirect (all `redirect()` targets
static) · CSRF (SameSite=Lax + `req.json()` content-type rejection) · admin
user-management guards (role allowlist, last-admin protection, self-deactivation
block) · Stripe webhook signature verification + event dedup · `review` /
`drafts/[id]` / `customers/suggest` / `DELETE submissions` ownership scoping.
