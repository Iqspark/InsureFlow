import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/submissions/[id]
// Deletes a quote owned by the authenticated broker. Bound policies
// (purchased) are protected and cannot be deleted.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const brokerId = session?.user?.id;
  if (!brokerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await prisma.submission.findUnique({
    where: { id: params.id },
    select: { brokerId: true, purchased: true },
  });

  if (!sub || sub.brokerId !== brokerId) {
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
