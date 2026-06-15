export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { requireRole } from "@/lib/access";
import UserManager from "@/components/admin/UserManager";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  requireRole(session, ["ADMIN"]);

  const users = await prisma.broker.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, active: true, licenseId: true },
  });

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
          <Link href="/admin" className="hover:text-indigo-600 transition-colors">Admin</Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Users</span>
        </div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">User Management</h1>
          <p className="text-slate-500 text-sm">Create accounts, assign roles, and activate or deactivate users.</p>
        </div>
        <UserManager
          initialUsers={users.map((u) => ({
            ...u,
            role: u.role as "ADMIN" | "BROKER" | "UNDERWRITER",
          }))}
        />
      </div>
    </div>
  );
}
