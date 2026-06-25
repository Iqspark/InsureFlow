"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Broker action: issue a Notice of Cancellation on a past-due, in-force policy.
export default function NoticeOfCancellationButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleIssue() {
    if (!confirm("Issue a Notice of Cancellation for non-payment? The policy will cancel on the notice's effective date unless paid.")) return;
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/notice-of-cancellation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setStatus("sent");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return <p className="text-sm font-medium text-red-700">Notice of cancellation issued.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleIssue}
        disabled={status === "sending"}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-medium rounded-xl shadow-xs transition-colors text-sm"
      >
        {status === "sending" ? "Issuing…" : "Issue Notice of Cancellation"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
