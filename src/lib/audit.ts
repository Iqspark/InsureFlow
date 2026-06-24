import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "bound"
  | "payment_link_resent"
  | "paid"
  | "adjusted"
  | "cancelled"
  | "reviewed";

// Append a lifecycle event. Best-effort: a logging failure never blocks the
// action that triggered it.
export async function recordAudit(e: {
  submissionId: string;
  action: AuditAction;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  detail?: string | null;
}): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        submissionId: e.submissionId,
        action: e.action,
        actorId: e.actorId ?? null,
        actorName: e.actorName ?? null,
        actorRole: e.actorRole ?? null,
        detail: e.detail ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to record", e.action, "for", e.submissionId, err);
  }
}
