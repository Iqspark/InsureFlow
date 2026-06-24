import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers, type Role, type SessionUser } from "@/lib/access";

const ROLES: Role[] = ["ADMIN", "BROKER", "UNDERWRITER"];

// PATCH /api/admin/users/[id] — change role and/or active state (Admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = session.user as unknown as SessionUser;
  if (!canManageUsers(me)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let role: string | undefined, active: boolean | undefined, password: string | undefined;
  try {
    ({ role, active, password } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const target = await prisma.broker.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (role !== undefined && !ROLES.includes(role as Role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (password !== undefined && password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  // Guard: never lock yourself out, and never remove the last admin.
  const losingAdmin =
    target.role === "ADMIN" &&
    ((role !== undefined && role !== "ADMIN") || active === false);
  if (losingAdmin) {
    const otherAdmins = await prisma.broker.count({
      where: { role: "ADMIN", active: true, id: { not: target.id } },
    });
    if (otherAdmins === 0) {
      return NextResponse.json({ error: "Cannot remove the last active admin" }, { status: 409 });
    }
  }
  if (target.id === me.id && active === false) {
    return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 409 });
  }

  const updated = await prisma.broker.update({
    where: { id: target.id },
    data: {
      ...(role !== undefined ? { role: role as Role } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(password !== undefined ? { password: bcrypt.hashSync(password, 10) } : {}),
    },
    select: { id: true, name: true, email: true, role: true, active: true, licenseId: true, createdAt: true },
  });

  return NextResponse.json({ success: true, user: updated });
}
