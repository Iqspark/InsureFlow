# Account & Troubleshooting

## How do I sign in?
Go to the login page and enter your email and password. If you're evaluating the portal, the login page has one-tap demo accounts for Broker, Underwriter, and Admin (password `Demo1234!`).

## I forgot my password — what do I do?
There is no self-service password reset. Ask your administrator to set a new temporary password for you. Admins do this on the **Users** page via **Reset Password**; they'll share a temporary password you can use to sign in (and change later with their help).

## How do I get an account?
An administrator creates accounts on the **Users** page (name, email, temporary password, and role). New users sign in with the temporary password provided.

## What roles are there and what can each do?
- **Broker** — quote, bind, and manage own clients and policies.
- **Underwriter** — review referred quotes from all brokers; see bound policies.
- **Admin** — full access plus portfolio analytics and user management.

## I can't see a page another colleague can.
Access is role-based. For example, only underwriters and admins see the review queue; only admins see the Users page and the admin dashboard. Brokers see only their own data.

## My account is inactive / I can't log in.
An admin may have deactivated the account, or the password may be wrong. Ask your administrator to confirm your account is active and, if needed, reset your password.

## A page looks empty or a chart is blank.
Charts and lists populate from real data. A new account with no quotes yet will show empty states ("No policies yet", "All caught up"). They fill in as you create quotes and policies.

## The "Get AI Recommendation" button shows "not configured."
The AI underwriter needs an AI key set in the environment. If it's not configured, underwriters simply review manually — the rest of the workflow is unaffected. Contact your administrator to enable it.

## A map isn't showing on a property quote.
Maps require a Google Maps key configured at build time. If it's missing, the address still works as plain text; ask your administrator to configure the key.

## A payment or customer-portal link says "This link has expired."
Public pay (`/pay/...`) and customer-portal (`/portal/...`) links **expire 30 days after they're issued**. To refresh one, the broker (or an admin) resends the payment link from the policy page or dashboard — that issues a fresh link with a new 30-day window. The same applies to a link that won't open or shows as invalid.

## The Help Navigator says my question is out of scope.
The assistant only answers from its knowledge base and won't guess. For account-specific or policy-specific details, contact your broker or administrator.
