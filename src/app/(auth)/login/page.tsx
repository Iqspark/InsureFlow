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
    { label: "Quote Time", value: "< 5 min" },
    { label: "Quote Types", value: "6" },
    { label: "Policies", value: "1,200+" },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* ── Desktop left panel (hidden on mobile) ─────────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden">
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(99,102,241,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.4) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <ShieldLogo />
            <span className="text-white text-2xl font-bold tracking-tight">
              InsureFlow
            </span>
          </div>
        </div>
        <div className="relative">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Your insurance
            <br />
            <span className="text-indigo-400">broker portal.</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Manage quotes, track policies, and serve your clients — all in one
            place.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-white/5 rounded-xl p-4 border border-white/10"
              >
                <p className="text-2xl font-bold text-indigo-400">
                  {stat.value}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-slate-600">
          © {new Date().getFullYear()} InsureFlow. Broker use only.
        </p>
      </div>

      {/* ── Right side: mobile hero + form ─────────────────────── */}
      <div className="flex-1 flex flex-col lg:items-center lg:justify-center lg:p-12">

        {/* Mobile hero banner — hidden on desktop */}
        <div className="lg:hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 px-8 pt-14 pb-24 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 login-hero-pattern" />
          <div className="relative">
            <div className="flex justify-center mb-3">
              <ShieldLogo />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
              InsureFlow
            </h1>
            <p className="text-indigo-200 text-sm">
              Your insurance broker portal
            </p>
            <div className="mt-6 grid grid-cols-4 gap-2 max-w-xs mx-auto">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-white/10 rounded-xl p-2.5 border border-white/10">
                  <p className="text-lg font-bold text-white leading-none">{stat.value}</p>
                  <p className="text-[9px] text-indigo-200 mt-0.5 leading-tight">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form card — overlaps hero on mobile, plain on desktop */}
        <div className="
          bg-white rounded-t-3xl shadow-2xl shadow-slate-900/10
          -mt-8 px-6 pt-8 pb-10 flex-1
          lg:rounded-xl lg:shadow-none lg:mt-0 lg:flex-none lg:max-w-sm lg:w-full lg:p-0
        ">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Sign in</h2>
          <p className="text-sm text-slate-500 mb-8">
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
        </div>
      </div>
    </div>
  );
}
