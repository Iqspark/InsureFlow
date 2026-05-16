-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
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
    "referralReasons" TEXT
);

-- CreateIndex
CREATE INDEX "Submission_createdAt_idx" ON "Submission"("createdAt");

-- CreateIndex
CREATE INDEX "Submission_decision_idx" ON "Submission"("decision");

-- CreateIndex
CREATE INDEX "Submission_province_idx" ON "Submission"("province");

-- CreateIndex
CREATE INDEX "Submission_contactEmail_idx" ON "Submission"("contactEmail");

-- CreateIndex
CREATE INDEX "Submission_vacancyDuration_idx" ON "Submission"("vacancyDuration");

-- CreateIndex
CREATE INDEX "Submission_propertyType_idx" ON "Submission"("propertyType");
