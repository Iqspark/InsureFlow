"use client";

import { useState } from "react";

export default function DeleteDraftButton({ draftId }: { draftId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/drafts/${draftId}`, { method: "DELETE" });
    window.location.href = "/dashboard";
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">Delete this draft?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium rounded-xl text-sm transition-colors"
        >
          {loading ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 font-medium rounded-xl border border-slate-200 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-red-50 text-red-600 font-medium rounded-xl border border-red-200 shadow-xs transition-colors text-sm"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      Delete Draft
    </button>
  );
}
