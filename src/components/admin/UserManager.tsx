"use client";

import { useState } from "react";

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900 text-sm">Users ({users.length})</h2>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">{error}</p>}

      {showAdd && (
        <form onSubmit={createUser} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required placeholder="Full name"
            className="px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
          />
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required type="email" placeholder="email@company.com"
            className="px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
          />
          <input
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required type="password" placeholder="Temporary password (min 8 chars)"
            className="px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            className="px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 font-medium text-slate-900 whitespace-nowrap">{u.name}</td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <select
                      value={u.role}
                      onChange={(e) => patchUser(u.id, { role: e.target.value as Role })}
                      className={`text-xs font-medium rounded-full border px-2.5 py-1 outline-none cursor-pointer ${ROLE_STYLES[u.role]}`}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
