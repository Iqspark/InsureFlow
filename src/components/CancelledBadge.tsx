// Shown on a bound policy that has been cancelled mid-term (instead of Paid/Unpaid).
export default function CancelledBadge() {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
      Cancelled
    </span>
  );
}
