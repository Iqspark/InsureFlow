"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-white/10"
    >
      Sign out
    </button>
  );
}
