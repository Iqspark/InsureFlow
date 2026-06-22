// One-off: seed a richer demo book for broker@demo.com so the dashboard
// analytics + renewals widgets present well. Safe to re-run (clears its own
// previously-seeded rows by the [DEMO] sessionId tag first).
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const TAG = "demo-book-seed";

const PRODUCTS = [
  "Farm Insurance",
  "Vacant Home Insurance",
  "Jeweller Block Insurance",
  "Cyber Liability Insurance",
  "Rental Home Insurance",
  "Retailers Insurance",
  "Contractor Insurance",
  "Personal Items Insurance",
];
const PROVINCES = ["ON", "AB", "BC", "SK", "MB", "NS", "QC"];
const NAMES = [
  "Morrison Family Farms", "Cedar Ridge Holdings", "Pat Delisle", "Northgate Jewellers",
  "Sunrise Dairy Co.", "Hillcrest Rentals", "Avery Contracting", "Lakeview Retail Ltd.",
  "Beaumont Estate", "Quinn O'Hara", "Prairie Grain Group", "Maple & Stone Co.",
  "Riverside Storage", "Glenwood Properties", "Tessier Boucher", "Highfield Cyber Inc.",
  "Westbrook Farms", "Ananya Rao", "Coleman Logistics", "Birchwood Holdings",
  "Dominic Russo", "Fairview Orchards", "Stellar Gems", "Harbour Point Rentals",
];

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];

(async () => {
  const broker = await p.broker.findFirst({ where: { email: "broker@demo.com" }, select: { id: true } });
  if (!broker) throw new Error("broker@demo.com not found — run npm run db:seed first");

  const cleared = await p.submission.deleteMany({ where: { sessionId: TAG } });
  const now = new Date();
  const rows = [];

  for (let i = 0; i < 26; i++) {
    const policyType = pick(PRODUCTS);
    const province = pick(PROVINCES);
    const applicantName = NAMES[i % NAMES.length];

    // Spread createdAt over the last ~6 months.
    const created = new Date(now);
    created.setDate(created.getDate() - rnd(185));

    // Outcome mix: ~60% accept, 20% refer, 20% decline.
    const roll = Math.random();
    const decision = roll < 0.6 ? "accept" : roll < 0.8 ? "refer" : "decline";

    const annualPremium = decision === "accept" ? 800 + rnd(60) * 150 : null;
    const monthlyPremium = annualPremium ? Math.round(annualPremium / 12) : null;
    const coverageAmount = decision === "accept" ? (3 + rnd(40)) * 100000 : null;

    let purchased = false, paymentStatus = "unpaid", paidAt = null, paidAmount = null;
    let effectiveAt = null, expiresAt = null;

    if (decision === "accept" && Math.random() < 0.7) {
      purchased = true;
      effectiveAt = new Date(created);
      effectiveAt.setDate(effectiveAt.getDate() + 1 + rnd(3));
      expiresAt = new Date(effectiveAt);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      if (Math.random() < 0.75) {
        paymentStatus = "paid";
        paidAt = new Date(effectiveAt);
        paidAmount = annualPremium;
      }
    }

    rows.push({
      brokerId: broker.id,
      policyType,
      sessionId: TAG,
      applicantName,
      contactEmail: applicantName.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "") + "@example.com",
      contactPhone: `(${200 + rnd(700)}) 555-${String(1000 + rnd(8999))}`,
      province,
      status: "complete",
      decision,
      annualPremium,
      monthlyPremium,
      coverageAmount,
      deductible: pick([1000, 2500, 5000, 10000]),
      purchased,
      paymentStatus,
      paidAt,
      paidAmount,
      effectiveAt,
      expiresAt,
      declineReasons: decision === "decline" ? JSON.stringify(["Risk outside current underwriting appetite."]) : null,
      referralReasons: decision === "refer" ? JSON.stringify(["Requires manual underwriter review."]) : null,
      allAnswers: "{}",
      createdAt: created,
    });
  }

  // Guarantee a few imminent renewals for the widget (bound, expiring soon).
  [10, 28, 52].forEach((days, idx) => {
    const eff = new Date(now);
    eff.setFullYear(eff.getFullYear() - 1);
    eff.setDate(eff.getDate() + days);
    const exp = new Date(eff);
    exp.setFullYear(exp.getFullYear() + 1);
    const annual = 1500 + idx * 600;
    rows.push({
      brokerId: broker.id,
      policyType: PRODUCTS[idx],
      sessionId: TAG,
      applicantName: ["Evergreen Acres", "Tundra Logistics", "Maplewood Estate"][idx],
      contactEmail: `renewal${idx}@example.com`,
      contactPhone: "(306) 555-0100",
      province: pick(PROVINCES),
      status: "complete",
      decision: "accept",
      annualPremium: annual,
      monthlyPremium: Math.round(annual / 12),
      coverageAmount: 1200000 + idx * 400000,
      deductible: 2500,
      purchased: true,
      paymentStatus: "paid",
      paidAt: eff,
      paidAmount: annual,
      effectiveAt: eff,
      expiresAt: exp,
      allAnswers: "{}",
      createdAt: eff,
    });
  });

  await p.submission.createMany({ data: rows });
  console.log(`Cleared ${cleared.count} prior demo rows; inserted ${rows.length} for broker@demo.com`);
  await p.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
