# Binding, Payments & Renewals

## How does a quote become a policy?
On an accepted quote, the broker presses **Buy This Policy**. This *binds* the quote — it becomes a policy (purchased) with a 12-month term — and the applicant is emailed a secure link to pay.

## How does the customer pay?
The applicant receives a tokenised payment link to a public checkout page (no login needed). When card processing is configured, the link opens a **secure Stripe checkout** and the customer pays by card there. The broker never handles the card. Once the payment is confirmed, the policy is marked **Paid**, activates, and a confirmation plus a receipt (with the branded policy PDF attached) are emailed.

## Is this a real charge?
Yes, when payments are configured. InsureFlow uses **Stripe secure checkout** for real card payments. If Stripe is not configured (for demos), the system falls back to a **simulated** checkout that validates the card format but does not charge — the broker and customer experience is otherwise the same. Either way, the policy shows **Paid** once payment is confirmed.

## How do I know a payment really went through?
A real Stripe payment is confirmed by Stripe itself (not by the customer's browser), and only then is the policy marked Paid. The policy detail page shows the Paid status and a receipt is emailed.

## What if the customer hasn't paid yet?
A bound-but-unpaid policy appears in the broker's **Action Required** with a **Resend Link** option. The broker can resend the payment link from the policy page or the dashboard. Resending also refreshes the link's 30-day expiry window.

## The payment link doesn't work or says it's expired.
Pay (and portal) links **expire 30 days after they're issued**. If a customer reports an expired or broken link, the broker can **resend** it from the policy page or dashboard, which issues a fresh link with a new 30-day window.

## Who gets notified?
- **Applicant** — payment-request email when bound, plus a confirmation and receipt after paying.
- **Broker** — notified when a referred quote is approved (it then appears in Action Required).
- **Underwriting team** — optionally notified when a policy is bound.

## Can a policy be changed after it's paid?
Yes — once a policy is paid, a broker or admin can make a **mid-term adjustment (MTA)** to revise the sum insured. The premium is recalculated and the difference is charged or returned pro-rata for the remaining term, and the customer is emailed a confirmation. (Adjustments are only available on paid policies.) See "Mid-Term Adjustments."

## Can a policy be cancelled mid-term?
Yes — once a policy is paid, a broker or admin can cancel it from the policy page. The customer is emailed a cancellation confirmation and a short-rate refund may apply. (Cancellation is only available on paid policies.) See "Cancellations & Refunds."

## What is the policy term?
Every policy is issued for a 12-month term. The effective and expiry dates are recorded when the policy is bound. The full lifecycle is: quote → (refer → underwriter review) → bind → pay → adjust (if needed) → renew or cancel.

## How do renewals surface?
Policies approaching their expiry appear in **Upcoming Renewals** on the broker dashboard, soonest first, with an amber badge when within 60 days (and a red badge if past due). Each customer's next renewal date also shows on the Customers page.

## Can a policy be deleted?
Quotes and drafts can be deleted, but a **bound policy is protected from deletion** to preserve the record.

## Can the customer see their policy without logging in?
Yes. The same email that carries the payment link also includes a **customer portal** link (`/portal/<token>`) where the customer can view their policy, download the policy PDF, and request a change — no login required. See "Customer Self-Service Portal."
