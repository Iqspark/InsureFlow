# Broker Guide — Using the InsureFlow Portal

## What's on my dashboard?
Your dashboard is a glance view of your book:
- **KPI cards** — total quotes, accepted, this month, and acceptance rate.
- **Analytics** — premium volume over the last 6 months, quote outcomes (close rate + accept/refer/decline split), product mix, and your total bound premium.
- **Action Required** — items needing your attention: approved quotes ready to bind, and bound policies awaiting customer payment.
- **Upcoming Renewals** — policies expiring soon, with days-to-renewal badges.
- **Recent Submissions**, **Recent Policies** (active policies), and **Cancelled Policies** — your latest activity, with links to the full lists.
- **Export CSV** — download your book for your own systems.

## How do I create a quote?
Click **New Quote**, pick a product (use the search box to find one fast), and answer the chat questions. You'll get an instant Accept, Decline, or Refer with a premium breakdown. The quote saves automatically.

## What do Accept, Decline, and Refer mean?
- **Accept** — the risk is within appetite; a premium is shown and you can bind it.
- **Decline** — the risk falls outside appetite; the reasons are shown.
- **Refer** — the risk needs an underwriter's review; it's sent to the review queue and you're notified when a decision is made.

## How do I bind a policy and collect payment?
On an accepted quote, press **Buy This Policy**. This binds the quote as a policy and emails the applicant a secure link to pay — you never handle the card. When card processing is configured, the customer pays via **Stripe secure checkout** (otherwise a simulated demo checkout); either way the policy shows **Paid** once payment is confirmed, the policy activates, and a receipt (with the policy PDF attached) is sent. You can resend the link from the policy page or your dashboard if needed — resending also refreshes the link's 30-day expiry.

## The customer says their payment link expired.
Pay and customer-portal links expire **30 days** after they're issued. Just **resend** the payment link from the policy page or dashboard to issue a fresh one with a new 30-day window.

## How do customers request changes?
From their **customer portal** link, a customer can submit a "Request a Change." You receive that request by **email** and follow up — the request is also recorded on the policy's Activity timeline. You then make any actual change (e.g. a mid-term adjustment). See "Customer Self-Service Portal."

## Where do I see the history of a policy?
Each policy detail page has an **Activity** timeline showing who did what and when — bound, payment link resent, paid, adjusted, cancelled, reviewed, and change requested — each with the actor and timestamp. It's an append-only record of the policy's lifecycle.

## Where do I find my policies and quotes?
- **Policies** — your bound policies, searchable by customer name or policy number (type-ahead suggestions).
- **Search** — find any quote or policy by name, application ID, date, policy type, or stage (quotes vs policies).
- **Customers** — every client grouped together with their policies, total premium, and next renewal; search by name or email.

## How do I adjust a policy mid-term?
Open the **paid** policy and click **Adjust Policy** (this option appears once the policy is paid). Enter the new coverage amount and an optional reason — a live estimate shows the new premium and the pro-rata additional or return premium for the remaining term. Confirm to apply it; the customer is emailed a confirmation and the change is logged in the policy's **Mid-Term Adjustments** history. See "Mid-Term Adjustments."

## How do I cancel a policy?
Open the **paid** policy and click **Cancel Policy** (this option appears once the policy is paid), add an optional reason, and confirm. The policy is flagged **Cancelled** (shown with a red Cancelled badge), the customer is emailed a cancellation confirmation, and a short-rate refund may apply (you calculate it). Cancelled policies drop out of Upcoming Renewals and move to the **Cancelled Policies** section on your dashboard. See "Cancellations & Refunds."

## How do renewals work?
Each policy is a 12-month term. Policies approaching their renewal date appear in **Upcoming Renewals** on your dashboard, with an amber badge when they're within 60 days.

## Can I edit an answer mid-quote?
Yes. You can go back and change any earlier answer; the questionnaire re-walks the path and keeps your still-relevant answers.

## Can I download a quote or policy?
Yes — open any saved quote or policy and download a branded PDF of the full details.
