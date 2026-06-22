import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submissionScopeWhere, type SessionUser } from "@/lib/access";

export const runtime = "nodejs";

// GET /api/submissions/export — role-scoped CSV of submissions.
// Honors the same filters as /api/search (name, appId, date, policyType).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as unknown as SessionUser;

  const { searchParams } = req.nextUrl;
  const name = searchParams.get("name")?.trim() ?? "";
  const appId = searchParams.get("appId")?.trim() ?? "";
  const date = searchParams.get("date") ?? "";
  const policyType = searchParams.get("policyType")?.trim() ?? "";
  const stage = searchParams.get("stage")?.trim() ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    ...submissionScopeWhere(user),
    ...(name ? { applicantName: { contains: name, mode: "insensitive" } } : {}),
    ...(policyType ? { policyType: { contains: policyType } } : {}),
    ...(stage === "policy" ? { purchased: true } : {}),
    ...(stage === "quote" ? { purchased: false } : {}),
  };

  // Underwriters export bound policies only — never quotes.
  if (user.role === "UNDERWRITER") where.purchased = true;
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  }
  if (appId) where.id = { startsWith: appId.toLowerCase() };

  const rows = await prisma.submission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      id: true,
      createdAt: true,
      applicantName: true,
      contactEmail: true,
      policyType: true,
      decision: true,
      status: true,
      purchased: true,
      paymentStatus: true,
      province: true,
      annualPremium: true,
      coverageAmount: true,
      deductible: true,
      effectiveAt: true,
      expiresAt: true,
      broker: { select: { name: true } },
    },
  });

  const headers = [
    "Application ID", "Created", "Applicant", "Email", "Policy Type", "Decision",
    "Status", "Stage", "Payment", "Province", "Annual Premium", "Coverage",
    "Deductible", "Effective", "Expires", "Broker",
  ];

  const fmtDate = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      r.id.slice(0, 10).toUpperCase(),
      fmtDate(r.createdAt),
      r.applicantName ?? "",
      r.contactEmail ?? "",
      r.policyType,
      r.decision ?? "",
      r.status,
      r.purchased ? "Policy" : "Quote",
      r.purchased ? r.paymentStatus : "",
      r.province ?? "",
      r.annualPremium ?? "",
      r.coverageAmount ?? "",
      r.deductible ?? "",
      fmtDate(r.effectiveAt),
      fmtDate(r.expiresAt),
      r.broker?.name ?? "",
    ].map(esc).join(","));
  }

  const csv = "﻿" + lines.join("\r\n"); // BOM for Excel
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="insureflow-policies-${stamp}.csv"`,
    },
  });
}
