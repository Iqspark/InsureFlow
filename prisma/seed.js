// prisma/seed.js — creates a demo broker account
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = bcrypt.hashSync("Demo1234!", 10);

  const brokers = await Promise.all([
    prisma.broker.upsert({
      where: { email: "broker@demo.com" },
      update: { password: hashedPassword },
      create: {
        name: "John Clarke",
        email: "broker@demo.com",
        password: hashedPassword,
        licenseId: "BRK-001",
      },
    }),
    prisma.broker.upsert({
      where: { email: "harpreet.singh@insureflow.com" },
      update: { password: hashedPassword },
      create: {
        name: "Harpreet Singh",
        email: "harpreet.singh@insureflow.com",
        password: hashedPassword,
        licenseId: "BRK-002",
      },
    }),
  ]);

  brokers.forEach((b) =>
    console.log(`\n✓ Seeded: ${b.name} <${b.email}>`)
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
