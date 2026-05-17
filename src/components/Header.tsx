import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "./SignOutButton";

function ShieldLogo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16 2L4 7v9c0 7 5.4 13.5 12 15 6.6-1.5 12-8 12-15V7L16 2z"
        fill="#4f46e5"
      />
      <path
        d="M16 6L7 10v6c0 4.8 3.6 9.2 9 10.5C21.4 25.2 25 20.8 25 16v-6L16 6z"
        fill="#6366f1"
      />
      <path
        d="M13 16l2 2 4-4"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export async function Header() {
  const session = await getServerSession(authOptions);
  const brokerName = session?.user?.name ?? "Broker";

  return (
    <header className="h-16 bg-slate-900 flex items-center px-4 sm:px-6 shrink-0 z-10 border-b border-slate-800">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 mr-8 shrink-0"
      >
        <ShieldLogo />
        <span className="text-white font-bold text-lg tracking-tight hidden sm:block">
          InsureFlow
        </span>
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-1 flex-1">
        <Link
          href="/dashboard"
          className="text-slate-300 hover:text-white text-sm px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors hidden sm:block"
        >
          Dashboard
        </Link>
        <Link
          href="/new-quote"
          className="text-slate-300 hover:text-white text-sm px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors hidden sm:block"
        >
          New Quote
        </Link>
        <Link
          href="/search"
          className="text-slate-300 hover:text-white text-sm px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors hidden sm:block"
        >
          Search
        </Link>
      </nav>

      {/* Broker info */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-slate-400 leading-none mb-0.5">
            Signed in as
          </p>
          <p className="text-sm text-white font-medium leading-none">
            {brokerName}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
          {brokerName.charAt(0).toUpperCase()}
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
