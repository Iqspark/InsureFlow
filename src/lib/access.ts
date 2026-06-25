import { redirect } from "next/navigation";
import type { Session } from "next-auth";

export type Role = "ADMIN" | "BROKER" | "UNDERWRITER";

export interface SessionUser {
  id: string;
  role: Role;
}

// Prisma `where` scope for listing submissions, by role.
// Admins and underwriters see everything; brokers see only their own.
export function submissionScopeWhere(user: SessionUser) {
  return user.role === "BROKER" ? { brokerId: user.id } : {};
}

export function canViewSubmission(
  user: SessionUser,
  sub: { brokerId: string | null }
): boolean {
  if (user.role === "ADMIN" || user.role === "UNDERWRITER") return true;
  return sub.brokerId === user.id;
}

// Can view the review area (queue, history) — admins get read-only oversight.
export function canReview(user: SessionUser): boolean {
  return user.role === "ADMIN" || user.role === "UNDERWRITER";
}

// Can actually approve/decline a referred quote. Underwriting is a controlled
// function, kept separate from admin (who manages users/system) for segregation
// of duties and a clean audit trail.
export function canDecideReview(user: SessionUser): boolean {
  return user.role === "UNDERWRITER";
}

export function canManageUsers(user: SessionUser): boolean {
  return user.role === "ADMIN";
}

// Owning broker (or admin) may bind/pay for a submission.
export function canBindOrPay(
  user: SessionUser,
  sub: { brokerId: string | null }
): boolean {
  if (user.role === "ADMIN") return true;
  return user.role === "BROKER" && sub.brokerId === user.id;
}

// Server-page guard: redirect to /dashboard if the session role isn't allowed.
export function requireRole(session: Session | null, roles: Role[]): SessionUser {
  if (!session?.user) redirect("/login");
  const user = session.user as unknown as SessionUser;
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}
