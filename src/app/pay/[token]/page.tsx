import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PaymentForm from "@/components/PaymentForm";
import { isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

function ShieldLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 2L4 7v9c0 7 5.4 13.5 12 15 6.6-1.5 12-8 12-15V7L16 2z" fill="#4f46e5" />
      <path d="M16 6L7 10v6c0 4.8 3.6 9.2 9 10.5C21.4 25.2 25 20.8 25 16v-6L16 6z" fill="#6366f1" />
      <path d="M13 16l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function fmtCAD(n: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 }).format(n);
}

export default async function PublicPayPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { paid?: string };
}) {
  const sub = await prisma.submission.findUnique({
    where: { paymentToken: params.token },
    select: {
      id: true, purchased: true, paymentStatus: true,
      annualPremium: true, policyType: true, applicantName: true,
    },
  });

  if (!sub || !sub.purchased) notFound();

  const appId = sub.id.slice(0, 10).toUpperCase();
  const isPaid = sub.paymentStatus === "paid";
  // Returned from Stripe Checkout; the webhook finalizes shortly after.
  const justReturnedFromStripe = searchParams?.paid === "1" && !isPaid;

  return (
    <div className="min-h-screen app-bg flex flex-col items-center px-4 py-10">
      <div className="flex items-center gap-2.5 mb-8">
        <ShieldLogo />
        <span className="text-slate-900 font-bold text-xl tracking-tight">InsureFlow</span>
      </div>

      <div className="w-full max-w-md space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Complete Your Payment</h1>
          <p className="text-sm text-slate-500 mt-1">
            {sub.policyType} · {sub.applicantName ?? "Your policy"}
          </p>
        </div>

        {isPaid || justReturnedFromStripe ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              {isPaid ? "Already paid" : "Payment received"}
            </h2>
            <p className="text-sm text-slate-500">
              {isPaid
                ? `Policy ${appId} (${fmtCAD(sub.annualPremium ?? 0)}) has already been paid. Thank you!`
                : `Thank you — your payment for policy ${appId} is being confirmed. A receipt will be emailed to you shortly.`}
            </p>
          </div>
        ) : (
          <PaymentForm
            endpoint={`/api/pay/${params.token}`}
            checkoutEndpoint={`/api/pay/${params.token}/checkout`}
            stripeEnabled={isStripeConfigured()}
            amount={sub.annualPremium ?? 0}
            appId={appId}
          />
        )}

        <p className="text-center text-xs text-slate-400">
          © {new Date().getFullYear()} InsureFlow · Secure checkout
        </p>
      </div>
    </div>
  );
}
