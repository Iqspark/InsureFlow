"use client";

export default function DownloadPolicyButton({ submissionId }: { submissionId: string }) {
  function download() {
    const a = document.createElement("a");
    a.href = `/api/policy/${submissionId}/document`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <button
      onClick={download}
      className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-sm transition-colors text-sm"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Download PDF
    </button>
  );
}
