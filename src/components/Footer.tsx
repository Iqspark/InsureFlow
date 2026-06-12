import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="h-11 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-4 sm:px-6 shrink-0">
      <p className="text-xs text-slate-500">
        <span className="sm:hidden">© {year} InsureFlow</span>
        <span className="hidden sm:inline">© {year} InsureFlow Broker Portal. All rights reserved.</span>
      </p>
      <div className="flex items-center gap-4">
        <Link
          href="/privacy"
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Privacy
        </Link>
        <Link
          href="/terms"
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Terms
        </Link>
        <Link
          href="/support"
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Support
        </Link>
      </div>
    </footer>
  );
}
