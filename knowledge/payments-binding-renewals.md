# Binding, Payments & Renewals

## How does a quote become a policy?
On an accepted quote, the broker presses **Buy This Policy**. This *binds* the quote — it becomes a policy (purchased) with a 12-month term — and the applicant is emailed a secure link to pay.

## How does the customer pay?
The applicant receives a tokenised payment link to a public checkout page (no login needed). They enter their card details and pay there. The broker never handles the card. On success, the policy is marked paid, activates, and a confirmation and receipt are emailed.

## Is this a real charge?
In the current build the card form is **format-validated only — there is no real charge** (a simulated gateway). A real payment processor can be connected later without changing the broker or customer experience.

## What if the customer hasn't paid yet?
A bound-but-unpaid policy appears in the broker's **Action Required** with a **Resend Link** option. The broker can resend the payment link from the policy page or the dashboard.

## Who gets notified?
- **Applicant** — payment-request email when bound, plus a confirmation and receipt after paying.
- **Broker** — notified when a referred quote is approved (it then appears in Action Required).
- **Underwriting team** — optionally notified when a policy is bound.

## Can a policy be changed after it's bound?
Yes — a broker or admin can make a **mid-term adjustment (MTA)** to revise the sum insured. The premium is recalculated and the difference is charged or returned pro-rata for the remaining term, and the customer is emailed a confirmation. See "Mid-Term Adjustments."

## Can a policy be cancelled mid-term?
Yes — a broker or admin can cancel a bound policy from the policy page. The customer is emailed a cancellation confirmation and a short-rate refund may apply. See "Cancellations & Refunds."

## What is the policy term?
Every policy is issued for a 12-month term. The effective and expiry dates are recorded when the policy is bound. The full lifecycle is: quote → (refer → underwriter review) → bind → pay → adjust (if needed) → renew or cancel.

## How do renewals surface?
Policies approaching their expiry appear in **Upcoming Renewals** on the broker dashboard, soonest first, with an amber badge when within 60 days (and a red badge if past due). Each customer's next renewal date also shows on the Customers page.

## Can a policy be deleted?
Quotes and drafts can be deleted, but a **bound policy is protected from deletion** to preserve the record.
