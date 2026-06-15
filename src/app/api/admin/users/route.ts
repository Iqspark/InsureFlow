import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers, type Role, type SessionUser } from "@/lib/access";

const ROLES: Role[] = ["ADMIN", "BROKER", "UNDERWRITER"];

// GET /api/admin/users — list all users (Admin only)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(session.user as unknown as SessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.broker.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, active: true, licenseId: true, createdAt: true },
  });
  return NextResponse.json({ data: users });
}

// POST /api/admin/users — create a user (Admin only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(session.user as unknown as SessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let name: string, email: string, password: string, role: string, licenseId: string | undefined;
  try {
    ({ name, email, password, role, licenseId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  name = (name ?? "").trim();
  email = (email ?? "").toLowerCase().trim();
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
  }
  if (!ROLES.includes(role as Role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if ((password as string).length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await prisma.broker.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });
  }

  const user = await prisma.broker.create({
    data: {
      name,
      email,
      password: bcrypt.hashSync(password, 10),
      role: role as Role,
      licenseId: (licenseId ?? "").trim() || null,
    },
    select: { id: true, name: true, email: true, role: true, active: true, licenseId: true, createdAt: true },
  });

  return NextResponse.json({ success: true, user }, { status: 201 });
}
