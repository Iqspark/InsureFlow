import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "./SignOutButton";
import MobileNav from "./MobileNav";

type Role = "ADMIN" | "BROKER" | "UNDERWRITER";

const NAV: Record<Role, { href: string; label: string }[]> = {
  BROKER: [
    { href: "/dashboard", label: "Overview" },
    { href: "/new-quote", label: "New Quote" },
    { href: "/policies", label: "My Policies" },
    { href: "/customers", label: "Customers" },
    { href: "/search", label: "Search" },
  ],
  UNDERWRITER: [
    { href: "/review", label: "Overview" },
    { href: "/reviews", label: "Reviews" },
    { href: "/search", label: "Search" },
  ],
  ADMIN: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/brokers", label: "Brokers" },
    { href: "/admin/users", label: "Users" },
    { href: "/reviews", label: "Reviews" },
    { href: "/customers", label: "Customers" },
    { href: "/search", label: "Search" },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  UNDERWRITER: "Underwriter",
  BROKER: "Broker",
};

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
  const role: Role = (session?.user?.role as Role) ?? "BROKER";
  const links = NAV[role];

  // Warm-coloured count badges per nav link.
  const badges: Record<string, number> = {};
  // Brokers: action-required (approved & unbound, or bound & unpaid).
  if (role === "BROKER" && session?.user?.id) {
    badges["/dashboard"] = await prisma.submission.count({
      where: {
        brokerId: session.user.id,
        OR: [
          { status: { not: "draft" }, decision: "accept", purchased: false },
          { purchased: true, paymentStatus: { not: "paid" } },
        ],
      },
    });
  }
  // Underwriters / admins: referred quotes awaiting a decision.
  if (role === "UNDERWRITER" || role === "ADMIN") {
    badges["/reviews"] = await prisma.submission.count({
      where: { decision: "refer", status: { not: "draft" } },
    });
  }

  return (
    <header className="h-16 bg-linear-to-r from-slate-900 via-slate-900 to-indigo-950 flex items-center px-4 sm:px-6 shrink-0 z-20 border-b border-white/10 shadow-lg shadow-indigo-950/20 supports-backdrop-filter:bg-slate-900/85 backdrop-blur-xl">
      {/* Mobile menu (hidden on desktop) */}
      <div className="mr-2 sm:hidden">
        <MobileNav links={links} badges={badges} />
      </div>

      {/* Logo */}
      <Link
        href={links[0].href}
        className="flex items-center gap-2.5 mr-8 shrink-0"
      >
        <ShieldLogo />
        <span className="text-white font-bold text-lg tracking-tight hidden sm:block">
          InsureFlow
        </span>
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-1 flex-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="relative text-slate-300 hover:text-white text-sm px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors hidden sm:block"
          >
            {l.label}
            {badges[l.href] > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {badges[l.href]}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* User info */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-slate-400 leading-none mb-0.5">
            {ROLE_LABEL[role]}
          </p>
          <p className="text-sm text-white font-medium leading-none">
            {brokerName}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-violet-500 ring-2 ring-white/15 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-xs">
          {brokerName.charAt(0).toUpperCase()}
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
