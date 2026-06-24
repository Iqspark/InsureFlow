"use client";

import { useState, Fragment } from "react";
import EmptyState from "@/components/EmptyState";

type Role = "ADMIN" | "BROKER" | "UNDERWRITER";

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  licenseId: string | null;
};

const ROLE_STYLES: Record<Role, string> = {
  ADMIN: "bg-violet-100 text-violet-700 border-violet-200",
  UNDERWRITER: "bg-amber-100 text-amber-700 border-amber-200",
  BROKER: "bg-indigo-100 text-indigo-700 border-indigo-200",
};

const ROLES: Role[] = ["ADMIN", "BROKER", "UNDERWRITER"];

export default function UserManager({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  // Reset-password inline panel state
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetDoneId, setResetDoneId] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
      )
    : users;

  // Add-user form state
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "BROKER" as Role });
  const [creating, setCreating] = useState(false);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create user");
      setUsers((prev) => [...prev, data.user]);
      setForm({ name: "", email: "", password: "", role: "BROKER" });
      setShowAdd(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  async function patchUser(id: string, body: { role?: Role; active?: boolean }) {
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  function genPassword() {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let s = "";
    for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  function openReset(id: string) {
    setError("");
    setResetDoneId(null);
    setResetPw(genPassword());
    setResetId(id);
  }

  async function submitReset(id: string) {
    if (resetPw.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setResetting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Password reset failed");
      setResetDoneId(id);
      setResetId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Password reset failed");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-semibold text-slate-900 text-sm">Users ({users.length})</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, or role…"
              className="w-56 pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 shadow-xs focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-hidden transition"
            />
          </div>
          <button
            onClick={() => setShowAdd((s) => !s)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">{error}</p>}

      {showAdd && (
        <form onSubmit={createUser} className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required placeholder="Full name"
            className="px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
          />
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required type="email" placeholder="email@company.com"
            className="px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
          />
          <input
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required type="password" placeholder="Temporary password (min 8 chars)"
            className="px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            className="px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="sm:col-span-2 flex gap-3">
            <button type="submit" disabled={creating} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition-colors">
              {creating ? "Creating…" : "Create User"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-600 font-medium rounded-lg border border-slate-200 text-sm transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          iconPath="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8z"
          title={q ? "No users match" : "No users yet"}
          subtitle={q ? `No user matches “${query}”.` : "Add your first user to get started."}
        />
      ) : (
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <Fragment key={u.id}>
                <tr className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 font-medium text-slate-900 whitespace-nowrap">{u.name}</td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <select
                      value={u.role}
                      onChange={(e) => patchUser(u.id, { role: e.target.value as Role })}
                      title="Role"
                      className={`text-xs font-medium rounded-full border px-2.5 py-1 outline-hidden cursor-pointer ${ROLE_STYLES[u.role]}`}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => patchUser(u.id, { active: !u.active })}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                        u.active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {u.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    {resetDoneId === u.id ? (
                      <span className="text-xs font-medium text-emerald-600">Password updated</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openReset(u.id)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        Reset password
                      </button>
                    )}
                  </td>
                </tr>
                {resetId === u.id && (
                  <tr className="bg-indigo-50/40">
                    <td colSpan={5} className="px-5 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-500">New temporary password for <span className="font-medium text-slate-700">{u.name}</span>:</span>
                        <input
                          value={resetPw}
                          onChange={(e) => setResetPw(e.target.value)}
                          title="New password"
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-mono text-sm w-44 outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                        />
                        <button type="button" onClick={() => setResetPw(genPassword())} className="text-xs font-medium text-slate-500 hover:text-slate-700">
                          Regenerate
                        </button>
                        <button type="button" onClick={() => submitReset(u.id)} disabled={resetting} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors">
                          {resetting ? "Saving…" : "Set password"}
                        </button>
                        <button type="button" onClick={() => setResetId(null)} className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg border border-slate-200 transition-colors">
                          Cancel
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5">Share this with the user — they can change it after signing in.</p>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}
