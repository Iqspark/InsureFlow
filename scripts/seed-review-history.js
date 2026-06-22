// One-off: stamp review history (reviewedAt/reviewedById) on existing
// accept/decline submissions so the underwriter /review analytics populate.
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const uw = await p.broker.findFirst({ where: { email: "underwriter@demo.com" }, select: { id: true } });
  if (!uw) throw new Error("underwriter@demo.com not found — run npm run db:seed first");

  const candidates = await p.submission.findMany({
    where: { decision: { in: ["accept", "decline"] }, reviewedAt: null },
    orderBy: { createdAt: "desc" },
    take: 26,
    select: { id: true, createdAt: true, decision: true },
  });

  let n = 0;
  for (const s of candidates) {
    const reviewed = new Date(s.createdAt);
    reviewed.setDate(reviewed.getDate() + 1 + Math.floor(Math.random() * 5));
    if (reviewed > new Date()) reviewed.setTime(Date.now());
    await p.submission.update({
      where: { id: s.id },
      data: {
        reviewedById: uw.id,
        reviewedAt: reviewed,
        reviewNote: s.decision === "accept" ? "Risk acceptable at priced premium." : "Outside current appetite.",
      },
    });
    n++;
  }
  console.log(`Stamped review history on ${n} submissions (reviewer: underwriter@demo.com)`);
  await p.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
