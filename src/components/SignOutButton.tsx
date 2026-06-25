"use client";

import { signOut } from "next-auth/react";

// On a shared/installed PWA, the service worker caches authenticated pages and
// /api responses in Cache Storage. Purge them (and unregister the SW) on sign-out
// so the next user can't read the previous broker's customer PII from the cache.
async function purgeClientCaches() {
  try {
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if (typeof navigator !== "undefined" && navigator.serviceWorker) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // Best-effort — never block sign-out on a cache-clear failure.
  }
}

export function SignOutButton() {
  return (
    <button
      onClick={async () => {
        await purgeClientCaches();
        await signOut({ callbackUrl: "/login" });
      }}
      className="text-sm text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-white/10"
    >
      Sign out
    </button>
  );
}
