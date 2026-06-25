// Payment methods recorded against a policy. "online_card" is the customer's
// online checkout (Stripe/simulated); the rest are broker-recorded offline
// payments (cash, cheque, EFT, pre-authorized debit, etc.).

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  online_card:   "Online card",
  cash:          "Cash",
  cheque:        "Cheque",
  eft:           "EFT / bank transfer",
  pad:           "Pre-authorized debit",
  card_terminal: "Card terminal",
  on_account:    "On account",
};

// Methods a broker may record manually (excludes the customer online-card path).
export const OFFLINE_PAYMENT_METHODS = [
  "cash", "cheque", "eft", "pad", "card_terminal", "on_account",
] as const;

export type OfflinePaymentMethod = (typeof OFFLINE_PAYMENT_METHODS)[number];

export function isOfflinePaymentMethod(m: unknown): m is OfflinePaymentMethod {
  return typeof m === "string" && (OFFLINE_PAYMENT_METHODS as readonly string[]).includes(m);
}

export function paymentMethodLabel(m?: string | null): string {
  return (m && PAYMENT_METHOD_LABELS[m]) || "—";
}
