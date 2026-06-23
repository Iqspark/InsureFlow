import Stripe from "stripe";

// Real Stripe checkout is active only when STRIPE_SECRET_KEY is set.
// Without it the app falls back to the simulated payment flow.
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}
