"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Buys (binds) a saved, accepted quote from the detail page and shows a
// persistent confirmation. Stays mounted across router.refresh() so the
// success message survives while the header badge updates to "Policy".
export default function BuyPolicyButton({
  submissionId,
  purchased,
}: {
  submissionId: string;
  purchased: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [sentTo, setSentTo] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [underwriterNotified, setUnderwriterNotified] = useState(false);

  async function handleBuy() {
    setStatus("sending");
    try {
      const res = await fetch("/api/buy-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSentTo(data.sentTo ?? "");
      setPreviewUrl(data.previewUrl ?? undefined);
      setUnderwriterNotified(Boolean(data.underwriterNotified));
      setStatus("sent");
      router.refresh(); // update the Quote → Policy badge in the header
    } catch {
      setStatus("error");
    }
  }

  // Just bought — show the confirmation (survives the refresh).
  if (status === "sent") {
    return (
      <div className="flex items-start gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl w-full">
        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-800">Policy bound successfully</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            A confirmation email has been sent to{" "}
            <span className="font-medium">{sentTo || "the applicant"}</span>
            {underwriterNotified ? ", and the underwriting team has been notified" : ""}. This quote
            is now a bound policy.
          </p>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Open confirmation email
            </a>
          )}
        </div>
      </div>
    );
  }

  // Already a bound policy (e.g. on a fresh page load) — nothing to do.
  if (purchased) return null;

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleBuy}
        disabled={status === "sending"}
        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium rounded-xl shadow-sm transition-colors text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {status === "sending" ? "Binding policy…" : "Buy This Policy"}
      </button>
      {status === "error" && (
        <span className="text-xs text-red-500">Couldn&apos;t bind policy. Try again.</span>
      )}
    </div>
  );
}
