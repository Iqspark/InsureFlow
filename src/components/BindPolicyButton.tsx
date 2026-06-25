"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Broker action: bind a signed proposal. Issues the full policy + invoice/pay link.
export default function BindPolicyButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "binding" | "bound" | "error">("idle");
  const [sentTo, setSentTo] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  async function handleBind() {
    setStatus("binding");
    setError(null);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/bind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to bind");
      setSentTo(data.sentTo ?? "");
      setPreviewUrl(data.previewUrl ?? undefined);
      setStatus("bound");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to bind");
      setStatus("error");
    }
  }

  if (status === "bound") {
    return (
      <div className="flex items-start gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl w-full">
        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-800">Policy bound &amp; issued</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            The policy is in force. The document and invoice were emailed to{" "}
            <span className="font-medium">{sentTo || "the customer"}</span>.
          </p>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
            >
              Open policy email
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleBind}
        disabled={status === "binding"}
        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium rounded-xl shadow-xs transition-colors text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {status === "binding" ? "Binding…" : "Review & Bind"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
