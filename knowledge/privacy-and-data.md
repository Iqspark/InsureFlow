# Privacy & Your Information

## What personal information does the portal collect?
To produce a quote and issue a policy, the portal collects the information you provide in the application — for example contact details (name, email, phone), the property/business/risk details relevant to the product, coverage choices, and loss history. Payment is completed on a secure checkout page.

## Why is this information needed?
It's used to assess the risk, calculate a premium, make an underwriting decision, issue and service the policy, and communicate with you about the quote or policy. Risk and loss details directly affect eligibility and pricing.

## Who can see my information?
Access is role-based:
- **Brokers** see only their own clients, quotes, and policies.
- **Underwriters and admins** can see across brokers as needed to review risks and oversee the book.

Every list, search, and export in the portal is scoped to what the signed-in role is allowed to see.

## Is my data shared?
Information may be shared with the insurer and other parties necessary to underwrite the risk, issue the policy, and handle claims, consistent with the Privacy Notice in your policy documents and applicable privacy law.

## How is payment information handled?
The payment link is unique to your policy and the checkout page is separate from the login area. When card processing is enabled, payment is taken through **Stripe**, a PCI-compliant payment processor, and your card details are entered on Stripe's secure page — InsureFlow does not store full card numbers. (For demo setups a simulated checkout validates the card format without charging.)

## How are the public links secured?
Customer pay (`/pay/...`) and customer-portal (`/portal/...`) links use a **secure, unique token** and are not guessable. For added safety they **expire 30 days after they're issued**; if a link expires, your broker can resend a fresh one. Don't share these links.

## Is system activity monitored?
The portal keeps an internal **activity log** of policy lifecycle events (for servicing and audit). The operator may also enable **error monitoring** to capture technical errors and keep the service reliable; this is operational telemetry, not marketing tracking.

## How long is my information kept?
Quote and policy records are retained for history, servicing, and compliance. Bound policies are protected from deletion to preserve the record.

## Can I access or correct my information?
Contact your broker or the administrator to review or update the information held about you. For formal privacy requests, refer to the Privacy Notice in your policy documents.

## Where can I read the full privacy terms?
The detailed **Privacy Notice Concerning Personal Information** is available in the knowledge base / policy documents. This page is a plain-language summary, not a substitute for that notice.
