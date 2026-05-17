-- CreateTable
CREATE TABLE "Broker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "licenseId" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "brokerId" TEXT,
    "policyType" TEXT NOT NULL DEFAULT 'Vacant Home Insurance',
    "applicantName" TEXT,
    "contactEmail" TEXT,
    "sessionId" TEXT,
    "province" TEXT,
    "propertyType" TEXT,
    "yearBuilt" INTEGER,
    "squareFootage" INTEGER,
    "propertyValue" REAL,
    "coveragePercent" TEXT,
    "deductible" REAL,
    "vacancyDuration" TEXT,
    "vacancyReason" TEXT,
    "inspectionFrequency" TEXT,
    "utilitiesWinterized" TEXT,
    "securityFeatures" TEXT,
    "hasPool" TEXT,
    "poolFenced" TEXT,
    "priorDamage" TEXT,
    "damageType" TEXT,
    "priorClaims" TEXT,
    "priorInsurance" TEXT,
    "allAnswers" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "annualPremium" REAL,
    "monthlyPremium" REAL,
    "coverageAmount" REAL,
    "declineReasons" TEXT,
    "referralReasons" TEXT,
    CONSTRAINT "Submission_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Submission" ("allAnswers", "annualPremium", "applicantName", "contactEmail", "coverageAmount", "coveragePercent", "createdAt", "damageType", "decision", "declineReasons", "deductible", "hasPool", "id", "inspectionFrequency", "monthlyPremium", "poolFenced", "priorClaims", "priorDamage", "priorInsurance", "propertyType", "propertyValue", "province", "referralReasons", "securityFeatures", "sessionId", "squareFootage", "updatedAt", "utilitiesWinterized", "vacancyDuration", "vacancyReason", "yearBuilt") SELECT "allAnswers", "annualPremium", "applicantName", "contactEmail", "coverageAmount", "coveragePercent", "createdAt", "damageType", "decision", "declineReasons", "deductible", "hasPool", "id", "inspectionFrequency", "monthlyPremium", "poolFenced", "priorClaims", "priorDamage", "priorInsurance", "propertyType", "propertyValue", "province", "referralReasons", "securityFeatures", "sessionId", "squareFootage", "updatedAt", "utilitiesWinterized", "vacancyDuration", "vacancyReason", "yearBuilt" FROM "Submission";
DROP TABLE "Submission";
ALTER TABLE "new_Submission" RENAME TO "Submission";
CREATE INDEX "Submission_createdAt_idx" ON "Submission"("createdAt");
CREATE INDEX "Submission_decision_idx" ON "Submission"("decision");
CREATE INDEX "Submission_province_idx" ON "Submission"("province");
CREATE INDEX "Submission_contactEmail_idx" ON "Submission"("contactEmail");
CREATE INDEX "Submission_vacancyDuration_idx" ON "Submission"("vacancyDuration");
CREATE INDEX "Submission_propertyType_idx" ON "Submission"("propertyType");
CREATE INDEX "Submission_brokerId_idx" ON "Submission"("brokerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Broker_email_key" ON "Broker"("email");

-- CreateIndex
CREATE INDEX "Broker_email_idx" ON "Broker"("email");
