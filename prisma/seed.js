// prisma/seed.js — creates a demo broker account
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = bcrypt.hashSync("Demo1234!", 10);

  const broker = await prisma.broker.upsert({
    where: { email: "broker@demo.com" },
    update: { password: hashedPassword },
    create: {
      name: "John Clarke",
      email: "broker@demo.com",
      password: hashedPassword,
      licenseId: "BRK-001",
    },
  });

  console.log(
    `\n✓ Demo broker seeded\n  Email:    ${broker.email}\n  Password: Demo1234!\n  Name:     ${broker.name}\n`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
