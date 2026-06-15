"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Inline delete for a quote in a list (dashboard / search). Bound policies
// (purchased) are protected and render nothing. After a successful delete it
// calls onDeleted (e.g. to drop a row from client state) or refreshes the page.
export default function DeleteQuoteButton({
  submissionId,
  purchased,
  onDeleted,
}: {
  submissionId: string;
  purchased?: boolean;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Bound policies can't be deleted — render an empty slot the same width as
  // the trash icon so the View/Resume column stays aligned across rows.
  if (purchased) return <span className="inline-block w-6" aria-hidden="true" />;

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  async function handleDelete(e: React.MouseEvent) {
    stop(e);
    setDeleting(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}`, { method: "DELETE" });
      if (res.ok) {
        if (onDeleted) onDeleted();
        else router.refresh();
      }
    } catch {
      /* leave the row in place on failure */
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            setConfirming(false);
          }}
          className="text-xs font-medium text-slate-400 hover:text-slate-600"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        stop(e);
        setConfirming(true);
      }}
      title="Delete quote"
      aria-label="Delete quote"
      className="text-slate-400 hover:text-red-500 transition-colors p-1"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  );
}
