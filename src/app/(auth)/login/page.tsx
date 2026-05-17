"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

function ShieldLogo() {
  return (
    <svg
      width="48"
      height="48"
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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  const stats = [
    { label: "Provinces", value: "13" },
    { label: "Policies", value: "1,200+" },
    { label: "Quote Time", value: "< 5 min" },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* ── Desktop left panel (hidden on mobile) ─────────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-10 login-left-pattern" />
        {/* Decorative glow orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-600/25 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <ShieldLogo />
          <span className="text-white text-2xl font-bold tracking-tight">InsureFlow</span>
        </div>

        {/* Middle — headline + features */}
        <div className="relative space-y-8">
          <div>
            <h1 className="text-5xl font-bold text-white leading-tight mb-4">
              Quote smarter.<br />
              <span className="text-indigo-400">Close faster.</span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed">
              Manage quotes, bind policies, and serve your clients — all in one place.
            </p>
          </div>

          {/* Feature checklist */}
          <ul className="space-y-3">
            {[
              "Instant underwriting decisions in under 5 minutes",
              "13 provinces covered across Canada",
              "Instant policy binding with email confirmation",
              "Full quote history and policy management",
              "Email confirmations sent automatically",
            ].map((f) => (
              <li key={f} className="flex items-start gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 12 12">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 6l3 3 5-5" />
                  </svg>
                </span>
                <span className="text-slate-300 text-sm leading-relaxed">{f}</span>
              </li>
            ))}
          </ul>

          {/* Social proof */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex -space-x-2">
              {(["bg-indigo-400","bg-violet-400","bg-cyan-400","bg-emerald-400"] as const).map((bg, i) => (
                <div key={i} className={`w-7 h-7 rounded-full border-2 border-slate-800 ${bg}`} />
              ))}
            </div>
            <p className="text-slate-400 text-xs">Trusted by brokers across Canada</p>
          </div>
        </div>

        <p className="relative text-xs text-slate-600">
          © {new Date().getFullYear()} InsureFlow. Broker use only.
        </p>
      </div>

      {/* ── Right side: mobile hero + form ─────────────────────── */}
      <div className="flex-1 flex flex-col lg:items-center lg:justify-center lg:p-16 lg:bg-gradient-to-br lg:from-slate-50 lg:via-white lg:to-indigo-50/40">

        {/* Mobile hero banner — hidden on desktop */}
        <div className="lg:hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 px-8 pt-10 pb-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 login-hero-pattern" />
          <div className="relative flex flex-col items-center gap-2">
            <ShieldLogo />
            <h1 className="text-2xl font-bold text-white tracking-tight">InsureFlow</h1>
            <p className="text-indigo-200 text-sm">Your insurance broker portal</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
              {stats.map((stat) => (
                <span key={stat.label} className="text-xs text-indigo-100 bg-white/10 rounded-full px-3 py-1 border border-white/10">
                  <strong>{stat.value}</strong> {stat.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Form card — overlaps hero on mobile, elevated card on desktop */}
        <div className="
          bg-white rounded-t-3xl shadow-2xl shadow-slate-900/10
          -mt-6 px-6 pt-12 pb-10 flex-1
          lg:rounded-2xl lg:shadow-2xl lg:shadow-indigo-100/60 lg:border lg:border-slate-100
          lg:mt-0 lg:flex-none lg:w-full lg:max-w-sm lg:px-8 lg:py-10
        ">
          {/* Desktop logo above form */}
          <div className="hidden lg:flex items-center gap-2 mb-7">
            <ShieldLogo />
            <span className="text-slate-800 font-bold text-lg tracking-tight">InsureFlow</span>
          </div>

          <p className="text-slate-500 mb-7">
            Enter your broker credentials to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="broker@example.com"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition text-sm"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                <svg
                  className="w-4 h-4 text-red-500 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-100"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in…
                </>
              ) : (
                "Sign in →"
              )}
            </button>
          </form>

          <div className="mt-6 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
            <p className="text-xs text-indigo-700 font-semibold mb-1">
              Demo credentials
            </p>
            <p className="text-xs text-slate-500">
              Email:{" "}
              <span className="text-indigo-600 font-mono">
                broker@demo.com
              </span>
            </p>
            <p className="text-xs text-slate-500">
              Password:{" "}
              <span className="text-indigo-600 font-mono">
                Demo1234!
              </span>
            </p>
          </div>

          {/* Security badge — desktop only */}
          <div className="hidden lg:flex items-center justify-center gap-1.5 mt-6 text-slate-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-[11px]">256-bit encrypted · Broker use only</span>
          </div>
        </div>
      </div>
    </div>
  );
}
