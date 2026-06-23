// Lifecycle stage indicator for completed submissions.
//  - bound policy        → "Policy"
//  - referred (under UW)  → "Under Review"  (it isn't a quote)
//  - declined             → no stage badge (the decision badge says "Declined")
//  - accepted, not bound  → "Quote"  (a real, bindable quote)
export default function StageBadge({
  purchased,
  decision,
}: {
  purchased: boolean;
  decision?: string | null;
}) {
  if (purchased) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-600 text-white">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        Policy
      </span>
    );
  }
  if (decision === "refer") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        Under Review
      </span>
    );
  }
  if (decision === "decline") return null;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-slate-500 border border-slate-300">
      Quote
    </span>
  );
}
