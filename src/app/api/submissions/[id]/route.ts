import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/access";

// DELETE /api/submissions/[id]
// Deletes a quote owned by the authenticated broker (or any quote for an admin).
// Bound policies (purchased) are protected and cannot be deleted.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as unknown as SessionUser;

  const sub = await prisma.submission.findUnique({
    where: { id: params.id },
    select: { brokerId: true, purchased: true },
  });

  const owns = sub && (user.role === "ADMIN" || sub.brokerId === user.id);
  if (!owns) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (sub.purchased) {
    return NextResponse.json(
      { error: "Bound policies cannot be deleted." },
      { status: 409 }
    );
  }

  await prisma.submission.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
