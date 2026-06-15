// prisma/seed.js — creates a demo broker account
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = bcrypt.hashSync("Demo1234!", 10);

  const brokers = await Promise.all([
    prisma.broker.upsert({
      where: { email: "admin@demo.com" },
      update: { password: hashedPassword, role: "ADMIN", active: true },
      create: {
        name: "Alex Morgan",
        email: "admin@demo.com",
        password: hashedPassword,
        licenseId: "ADM-001",
        role: "ADMIN",
      },
    }),
    prisma.broker.upsert({
      where: { email: "underwriter@demo.com" },
      update: { password: hashedPassword, role: "UNDERWRITER", active: true },
      create: {
        name: "Sarah Bennett",
        email: "underwriter@demo.com",
        password: hashedPassword,
        licenseId: "UW-001",
        role: "UNDERWRITER",
      },
    }),
    prisma.broker.upsert({
      where: { email: "broker@demo.com" },
      update: { password: hashedPassword, role: "BROKER", active: true },
      create: {
        name: "John Clarke",
        email: "broker@demo.com",
        password: hashedPassword,
        licenseId: "BRK-001",
        role: "BROKER",
      },
    }),
    prisma.broker.upsert({
      where: { email: "harpreet.singh@insureflow.com" },
      update: { password: hashedPassword, role: "BROKER", active: true },
      create: {
        name: "Harpreet Singh",
        email: "harpreet.singh@insureflow.com",
        password: hashedPassword,
        licenseId: "BRK-002",
        role: "BROKER",
      },
    }),
  ]);

  brokers.forEach((b) =>
    console.log(`\n✓ Seeded: ${b.name} <${b.email}> [${b.role}]`)
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
