# InsureFlow — Demo Script

A click-by-click runbook for demoing InsureFlow to a brokerage firm. The core
flow is ~10 minutes; role deep-dives add ~5 each. Lead with the **story**
(quote → refer → AI review → approve → bind → pay via Stripe → receipt + PDF →
customer portal → adjust/cancel → audit), then show oversight.

---

## 0. Pre-flight checklist (do this 30 min before)

- [ ] **Deploy is live** — latest `main` is built & deployed (check GitHub Actions is green; load the Azure URL).
- [ ] **Env vars set on the host**: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (= public URL; payment + portal links). Optional but recommended for the full story: `OPENAI_API_KEY` (AI recommendation), `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (maps, build-time), `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (real test-mode checkout), `RESEND_API_KEY` + `SMTP_FROM` (real email). Without Stripe keys the payment step falls back to a simulated gateway; without email vars it falls back to the Ethereal preview inbox.
- [ ] **Demo data present** — dashboard charts and review queue are populated (re-run `node scripts/seed-demo-book.js` and `node scripts/seed-review-history.js` against the demo DB if they look empty).
- [ ] **Browser ready** — one clean window, zoom ~110%, close other tabs/notifications. Have the login page open.
- [ ] **One dry-run** of the core flow so nothing surprises you.

**Demo logins** (all password `Demo1234!`): `broker@demo.com` · `underwriter@demo.com` · `admin@demo.com`
On the login page, the **Demo accounts** chips (Broker / Underwriter / Admin) sign in with one tap — use them to switch roles fast.

---

## 1. Opening (30 sec)

> "InsureFlow is a multi-product broker portal. A broker can quote a client
> conversationally, get an instant decision, and — when underwriting is needed —
> hand off to an underwriter with an AI-assisted recommendation, then bind the
> policy and collect payment. Let me walk the whole lifecycle."

Show the **login page** (it's polished — split-screen, product highlights). Tap the **Broker** demo chip.

---

## 2. Broker dashboard — "the book at a glance" (1 min)

Land on `/dashboard`. Talk to:
- **Gradient KPI cards** — Total Quotes, Accepted, This Month, Acceptance Rate.
- **Analytics** — *"Brokers see their own book: premium volume by month, win rate, product mix, and total bound premium."*
- **Action Required** (orange) — *"Money on the table: approved quotes to bind, policies awaiting payment."*
- **Upcoming Renewals** — *"Lifecycle is built in — policies expiring soon surface automatically."*
- Point at **Export CSV** — *"Everything's exportable for their own systems."*

---

## 3. Create a quote → conversational, multi-product (2 min)

Click **New Quote**.
- Show the **product catalog** + the **search box** — type "farm" → **Farm Insurance**.
- *"Ten products ship today — Vacant Home, Jeweller's Block, Farm, Cyber, and more — all on one engine."*
- Start **Farm Insurance**. Walk a few questions to show the **conversational, module-based** flow (Alex the virtual broker). Mention it mirrors the real paper application's sections.
- **To show a REFERRAL** (sets up the underwriter story), answer so it refers — e.g. uncertified wood heat, no smoke detectors, or an unfenced pool. Submit.
- Land on the **Refer** result: *"Instead of a flat decline, the engine routes borderline risks to an underwriter — with the exact reasons."*

> Tip: if you'd rather not walk the full form live, open an existing **referred**
> quote from the dashboard/search instead and narrate the same point.

---

## 4. Underwriter — the AI moment (2–3 min) ⭐

Switch role: top-right → sign out → **Underwriter** demo chip (or open `/review`).

- **Overview** (`/review`) — *"The underwriter's command center: pending count, premium at risk, approval rate, and analytics — decisions over time, top referral reasons."*
- **Pending queue** — *"Sorted oldest-first with aging badges, so nothing breaches SLA."* Click **Pending** tab to show the full searchable list.
- Open the **referred quote** you just created (or any pending one).
- Click **Get AI Recommendation** ⭐ — *"This is the differentiator. The AI underwriter reads the full application and the referral reasons and returns a typed verdict — approve or decline, with confidence and specific reasons — and pre-fills the note. The human still decides."*
- **Approve** it. *"On approval the broker is emailed and it appears in their Action Required."*
- Show **All Reviews** tab — *"Full audit trail of every decision, searchable by name or policy."*

---

## 5. Broker binds + customer pays via Stripe (1–2 min)

Switch back to **Broker**.
- Dashboard → **Action Required** shows the just-approved quote → open it.
- Click **Buy This Policy** — *"Binding assigns a human-readable **policy number** (e.g. `VH-2026-7K3M9Q`) and emails the applicant a secure payment link — the broker never handles the card."*
- Open the emailed link (Resend/SMTP if configured, else the Ethereal preview button) → the **public payment page**. Two pay links are emailed: `/pay/<token>` (checkout) and `/portal/<token>` (self-service portal).
- With Stripe configured, **Pay** redirects to **Stripe's secure hosted checkout** → enter test card **4242 4242 4242 4242** (any future expiry / CVC) → complete. *"This is a **real charge in Stripe test mode** — no live money moves. A signature-verified webhook is the authoritative 'paid' signal, and a return-page safety net finalizes even if the webhook is delayed."* Without Stripe keys, the page shows the **simulated** gateway instead — same flow, no charge.
- On success the customer is emailed a **payment receipt with the branded policy PDF attached**, plus a confirmation email.
- *"Policy is now bound and paid — and it shows in Renewals 12 months out."*

> Note: public pay/portal links **expire after 30 days**; resending or re-binding refreshes the window.

---

## 5a. Customer self-service portal (1 min) ⭐

Open the emailed **`/portal/<token>`** link (public, no login — *"this is what the policyholder sees"*).
- Read-only policy view: **status** (Active / Awaiting payment / Cancelled), premium, coverage and term cards, property map, and structured details.
- **Download PDF** — the same branded policy document, served straight from the token.
- **Request a Change** — *"the customer types what they want changed; it emails their broker and logs to the audit trail."* Submit one to show it (it'll appear on the policy's Activity timeline in a moment).

---

## 5b. Servicing the policy — adjust & cancel (1–2 min) ⭐

Open the bound policy (Policies tab or the link). This shows the **full lifecycle**, not just new business.

**Mid-term adjustment (MTA):**
- Click **Adjust Policy** → raise the **coverage amount** (e.g. +50%) and add a reason.
- *"Watch the live estimate — the premium recalculates and the system charges the **pro-rata additional premium** for just the remaining days of the term."*
- Click **Confirm adjustment** → success box appears with **"Open adjustment email"** → open it to show the customer's confirmation. The policy now lists a **Mid-Term Adjustments** history row.

**Cancellation:**
- Click **Cancel Policy** → add a reason → **Confirm cancellation**.
- *"The customer is emailed a cancellation confirmation — short-rate refund noted — and the policy is flagged Cancelled and drops out of renewals."* Click **"Open cancellation email"** to show it.

**Activity timeline (audit trail):**
- Scroll to the policy's **Activity** section — *"every lifecycle event is logged append-only: bound, payment link sent, paid, adjusted, cancelled, reviewed, and customer change-requests — each with who did it and when."* The change request from the portal (section 5a) shows up here.

> Tip: do the MTA on a normal policy and the cancellation on a throwaway one, so you can keep showing the adjusted policy. Reset afterward with the seed scripts.

---

## 6. Client 360 + find anything (1 min)

Still as broker:
- **Customers** tab — *"Every client with their policies, total premium, and next renewal. Type a name and it suggests as you go."* Demo the typeahead.
- **Policies** tab — typeahead by **name or policy number**; select jumps straight to the policy.

---

## 7. Admin — oversight & control (1–2 min)

Switch to **Admin**.
- `/admin` — *"Portfolio view across all brokers: premium bound, paid policies, pending referrals — plus **top brokers by premium** and product mix."*
- **Users** — create a user, change a role, toggle active, and **Reset Password** (inline temp password). *"Full RBAC: Admin, Broker, Underwriter."*

---

## 8. Close (30 sec)

> "So end-to-end: conversational quoting across products, instant decisions,
> AI-assisted underwriting with a human in the loop, binding with collected
> payment, renewals, client management, and full admin oversight — one platform,
> role-aware throughout."

---

## If asked — roadmap framing (turn gaps into a plan)

Frame missing items as **deliberately sequenced**, not absent:
- **Commission tracking** → roadmap (data model supports it).
- **SSO / bulk user import / password self-service** → roadmap (RBAC foundation is in).
- **Real payment processor (Stripe)** → *"live: real Stripe hosted checkout in test mode today, with a signature-verified webhook; flip to live keys to take real money."*
- **Audit log / SLA reporting** → *"append-only audit trail ships today (the Activity timeline); SLA reporting is roadmap."*
- **White-label branding** → straightforward; can be themed per brokerage.
- **AI underwriter** → today an advisory recommendation; can grow into deeper, document-aware review.

---

## Reset between demos

- Re-seed demo book: `node scripts/seed-demo-book.js`
- Re-seed review history: `node scripts/seed-review-history.js`
- Demo passwords are all `Demo1234!` (if you reset one during the Admin demo, set it back).
