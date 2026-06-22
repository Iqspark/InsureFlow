import { Question } from "@/types";

// ============================================================
// LITHIUM BATTERIES (PRODUCT LIABILITY) — CONVERSATIONAL FLOW
// ============================================================
// Mirrors the jeweller-block question schema. Answer ids are
// mapped to rating factors in lithiumBatteriesQuoteCalculator.ts
// and to decline/refer triggers via underwritingRules below.
//
// NOTE: `applicant_name`, `contact_phone`, and `contact_email`
// reuse the same ids as the other flows so the persistence layer
// maps them to the universal Submission columns without special-casing.
// ============================================================

export const BATTERY_QUESTIONS: Question[] = [
  // ── INTRODUCTION ─────────────────────────────────────────
  {
    id: "applicant_name",
    type: "text",
    inputType: "name",
    brokerText:
      "Hi there! 👋 I'm Alex, your virtual insurance broker. I'll put together a Lithium Batteries product liability quote for your business in just a few minutes. What's your name?",
    helperText: "Just your first name is perfectly fine.",
    placeholder: "e.g. Marcus",
    defaultNextQuestionId: "company_name",
    required: true,
    summaryLabel: "Contact Name",
    summarySection: "Business",
  },

  // ── BUSINESS PROFILE ─────────────────────────────────────
  {
    id: "company_name",
    type: "text",
    brokerText:
      "Great to meet you, {{applicant_name}}! What's the legal name of the business we're quoting?",
    helperText: "The entity that would be the named insured on the policy.",
    placeholder: "e.g. NorthCell Power Inc.",
    defaultNextQuestionId: "business_province",
    required: true,
    summaryLabel: "Company Name",
    summarySection: "Business",
  },

  {
    id: "business_province",
    type: "dropdown",
    brokerText: "Which province or territory is the business based in?",
    helperText: "We write product liability across Canada.",
    options: [
      { label: "Alberta", value: "AB" },
      { label: "British Columbia", value: "BC" },
      { label: "Manitoba", value: "MB" },
      { label: "New Brunswick", value: "NB" },
      { label: "Newfoundland and Labrador", value: "NL" },
      { label: "Northwest Territories", value: "NT" },
      { label: "Nova Scotia", value: "NS" },
      { label: "Nunavut", value: "NU" },
      { label: "Ontario", value: "ON" },
      { label: "Prince Edward Island", value: "PE" },
      { label: "Quebec", value: "QC" },
      { label: "Saskatchewan", value: "SK" },
      { label: "Yukon", value: "YT" },
    ],
    defaultNextQuestionId: "business_role",
    underwritingRules: [
      {
        operator: "in_list",
        value: ["NT", "NU", "YT"],
        decision: "refer",
        message:
          "Businesses in the Northern Territories and Nunavut require individual underwriter review due to remoteness and limited distribution/recall infrastructure.",
      },
    ],
    ratingFactor: "province",
    summaryLabel: "Province",
    summarySection: "Business",
  },

  {
    id: "business_role",
    type: "choice",
    brokerText:
      "What best describes the role in the lithium-battery supply chain?",
    helperText:
      "Your position in the chain determines how much primary product liability you carry.",
    options: [
      { label: "Manufacturer", value: "manufacturer", emoji: "🏭", description: "Carries primary liability" },
      { label: "Importer / Brand Owner", value: "importer", emoji: "🌐", description: "Carries primary liability" },
      { label: "Distributor / Wholesaler", value: "distributor", emoji: "📦" },
      { label: "Reseller / Retailer", value: "reseller", emoji: "🛒" },
    ],
    defaultNextQuestionId: "battery_chemistry",
    underwritingRules: [
      {
        operator: "in_list",
        value: ["manufacturer", "importer"],
        decision: "refer",
        message:
          "Manufacturers and importers/brand owners carry primary product liability and require individual underwriter review.",
      },
    ],
    ratingFactor: "businessRole",
    summaryLabel: "Supply-Chain Role",
    summarySection: "Business",
  },

  // ── PRODUCT PROFILE ──────────────────────────────────────
  {
    id: "battery_chemistry",
    type: "choice",
    brokerText: "What battery chemistry does the product line use?",
    helperText:
      "Cell chemistry is a primary driver of thermal-runaway hazard.",
    options: [
      { label: "Li-ion (consumer cells)", value: "li_ion", emoji: "🔋" },
      { label: "Li-polymer", value: "li_poly", emoji: "🪫" },
      { label: "LiFePO4", value: "lifepo4", emoji: "🟢", description: "Lower hazard" },
      { label: "Lithium-metal (primary)", value: "li_metal", emoji: "⚠️", description: "Higher hazard" },
      { label: "Mixed chemistries", value: "mixed", emoji: "🧪" },
    ],
    defaultNextQuestionId: "application",
    underwritingRules: [
      {
        operator: "equals",
        value: "li_metal",
        decision: "refer",
        message:
          "Lithium-metal (primary) cells are a higher-hazard chemistry and require individual underwriter review.",
      },
    ],
    ratingFactor: "batteryChemistry",
    summaryLabel: "Battery Chemistry",
    summarySection: "Product",
  },

  {
    id: "application",
    type: "choice",
    brokerText: "What is the primary end-use application for these batteries?",
    helperText:
      "End use drives the severity and recall exposure of a potential failure.",
    options: [
      { label: "Consumer electronics", value: "consumer_electronics", emoji: "📱" },
      { label: "Power tools", value: "power_tools", emoji: "🔧" },
      { label: "E-mobility (e-bikes/scooters)", value: "e_mobility", emoji: "🛴", description: "Requires review" },
      { label: "EV / automotive", value: "ev_automotive", emoji: "🚗", description: "Requires review" },
      { label: "Energy storage systems", value: "energy_storage", emoji: "🏠" },
      { label: "Other", value: "other", emoji: "❓" },
    ],
    defaultNextQuestionId: "annual_turnover",
    underwritingRules: [
      {
        operator: "in_list",
        value: ["e_mobility", "ev_automotive"],
        decision: "refer",
        message:
          "E-mobility and EV/automotive applications carry high recall and bodily-injury exposure and require individual underwriter review.",
      },
    ],
    ratingFactor: "application",
    summaryLabel: "End-Use Application",
    summarySection: "Product",
  },

  // ── EXPOSURE & COVERAGE ──────────────────────────────────
  {
    id: "annual_turnover",
    type: "currency",
    brokerText:
      "What is the annual turnover (in CAD) attributable to the lithium-battery products? This drives the premium base.",
    helperText:
      "Use gross revenue from the battery products for the most recent 12 months.",
    placeholder: "2,000,000",
    min: 50000,
    max: 200000000,
    prefix: "$",
    defaultNextQuestionId: "certification",
    underwritingRules: [
      {
        operator: "greater_than",
        value: 50000000,
        decision: "refer",
        message:
          "Annual turnover exceeding $50,000,000 CAD requires senior underwriter approval and a review of the product portfolio.",
      },
    ],
    ratingFactor: "annualTurnover",
    summaryLabel: "Annual Turnover",
    summarySection: "Exposure & Coverage",
  },

  {
    id: "certification",
    type: "choice",
    brokerText:
      "What safety certification do the cells and packs hold?",
    helperText:
      "Independent certification (UL/IEC) with factory auditing attracts the best terms.",
    options: [
      { label: "UL/IEC certified + factory audited", value: "ul_audited", emoji: "🏆", description: "Best rate" },
      { label: "UL/IEC certified", value: "ul_certified", emoji: "✅", description: "Standard" },
      { label: "Self-certified / CE only", value: "self_certified", emoji: "⚠️", description: "Requires review" },
      { label: "None", value: "none", emoji: "🚫", description: "Outside appetite" },
    ],
    defaultNextQuestionId: "recall_history",
    underwritingRules: [
      {
        operator: "equals",
        value: "none",
        decision: "decline",
        message:
          "Uncertified lithium-battery products fall outside our underwriting appetite.",
      },
      {
        operator: "equals",
        value: "self_certified",
        decision: "refer",
        message:
          "Self-certified / CE-only products without independent UL/IEC certification require underwriter review.",
      },
    ],
    ratingFactor: "certification",
    summaryLabel: "Safety Certification",
    summarySection: "Product",
  },

  {
    id: "recall_history",
    type: "toggle",
    brokerText:
      "Has any of the product been subject to a recall in the last 5 years?",
    helperText:
      "Includes voluntary recalls and regulator-mandated recalls or stop-sale notices.",
    options: [
      { label: "Yes — there was a recall", value: "yes" },
      { label: "No recalls", value: "no" },
    ],
    defaultNextQuestionId: "coverage_limit",
    underwritingRules: [
      {
        operator: "equals",
        value: "yes",
        decision: "refer",
        message:
          "A product recall within the last 5 years requires underwriter review of the root cause and corrective actions.",
      },
    ],
    ratingFactor: "recallHistory",
    summaryLabel: "Recall in Last 5 Years",
    summarySection: "Loss History",
  },

  {
    id: "coverage_limit",
    type: "choice",
    brokerText: "What product liability aggregate limit would you like?",
    helperText:
      "This is the most we would pay in total for product liability claims in a policy period.",
    options: [
      { label: "$1,000,000 CAD", value: 1000000, description: "Entry limit" },
      { label: "$2,000,000 CAD", value: 2000000, description: "Most popular" },
      { label: "$5,000,000 CAD", value: 5000000, description: "Higher limit" },
      { label: "$10,000,000 CAD", value: 10000000, description: "Highest limit" },
    ],
    defaultNextQuestionId: "prior_claims",
    ratingFactor: "coverageLimit",
    summaryLabel: "Aggregate Limit",
    summarySection: "Exposure & Coverage",
  },

  // ── LOSS HISTORY ─────────────────────────────────────────
  {
    id: "prior_claims",
    type: "choice",
    brokerText:
      "How many product liability claims has the business had in the last 5 years?",
    options: [
      { label: "None", value: 0, emoji: "✅" },
      { label: "1 claim", value: 1, emoji: "1️⃣" },
      { label: "2 claims", value: 2, emoji: "2️⃣" },
      { label: "3 or more", value: "3+", emoji: "⚠️" },
    ],
    defaultNextQuestionId: "deductible",
    conditionalBranches: [
      { when: { operator: "equals", value: 1 },    nextQuestionId: "claim_1_cause" },
      { when: { operator: "equals", value: 2 },    nextQuestionId: "claim_1_cause" },
      { when: { operator: "equals", value: "3+" }, nextQuestionId: "claim_1_cause" },
    ],
    underwritingRules: [
      {
        operator: "equals",
        value: "3+",
        decision: "refer",
        message:
          "Three or more product liability claims within 5 years requires manual underwriter review.",
      },
    ],
    ratingFactor: "priorClaims",
    summaryLabel: "Claims (5 yrs)",
    summarySection: "Loss History",
  },

  // ── CLAIM DETAILS — asked only when 1+ prior claims ──────
  {
    id: "claim_1_cause",
    type: "choice",
    brokerText:
      "What was the cause of the most recent product liability claim?",
    options: [
      { label: "Fire / thermal runaway", value: "fire", emoji: "🔥" },
      { label: "Explosion / rupture", value: "explosion", emoji: "💥" },
      { label: "Burns or injury", value: "injury", emoji: "🚑" },
      { label: "Product recall", value: "recall", emoji: "📦" },
      { label: "Property damage", value: "property_damage", emoji: "🏚️" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "claims_resolved",
    conditionalBranches: [
      { when: { questionId: "prior_claims", operator: "equals", value: 2 },    nextQuestionId: "claim_2_cause" },
      { when: { questionId: "prior_claims", operator: "equals", value: "3+" }, nextQuestionId: "claim_2_cause" },
    ],
    underwritingRules: [
      {
        operator: "equals",
        value: "fire",
        decision: "refer",
        message:
          "A prior thermal-runaway/fire loss requires underwriter review.",
      },
    ],
    summaryLabel: "Claim 1 — Cause",
    summarySection: "Loss History",
  },

  {
    id: "claim_2_cause",
    type: "choice",
    brokerText:
      "What was the cause of the second product liability claim?",
    options: [
      { label: "Fire / thermal runaway", value: "fire", emoji: "🔥" },
      { label: "Explosion / rupture", value: "explosion", emoji: "💥" },
      { label: "Burns or injury", value: "injury", emoji: "🚑" },
      { label: "Product recall", value: "recall", emoji: "📦" },
      { label: "Property damage", value: "property_damage", emoji: "🏚️" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "claims_resolved",
    conditionalBranches: [
      { when: { questionId: "prior_claims", operator: "equals", value: "3+" }, nextQuestionId: "claim_3_cause" },
    ],
    underwritingRules: [
      {
        operator: "equals",
        value: "fire",
        decision: "refer",
        message:
          "A prior thermal-runaway/fire loss requires underwriter review.",
      },
    ],
    summaryLabel: "Claim 2 — Cause",
    summarySection: "Loss History",
  },

  {
    id: "claim_3_cause",
    type: "choice",
    brokerText:
      "What was the cause of the third product liability claim?",
    options: [
      { label: "Fire / thermal runaway", value: "fire", emoji: "🔥" },
      { label: "Explosion / rupture", value: "explosion", emoji: "💥" },
      { label: "Burns or injury", value: "injury", emoji: "🚑" },
      { label: "Product recall", value: "recall", emoji: "📦" },
      { label: "Property damage", value: "property_damage", emoji: "🏚️" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "claims_resolved",
    underwritingRules: [
      {
        operator: "equals",
        value: "fire",
        decision: "refer",
        message:
          "A prior thermal-runaway/fire loss requires underwriter review.",
      },
    ],
    summaryLabel: "Claim 3 — Cause",
    summarySection: "Loss History",
  },

  {
    id: "claims_resolved",
    type: "toggle",
    brokerText:
      "Has the underlying product issue been corrected (design fix / recall completed)?",
    options: [
      { label: "Yes — corrected", value: "yes" },
      { label: "No — not yet corrected", value: "no" },
    ],
    defaultNextQuestionId: "claims_largest_amount",
    underwritingRules: [
      {
        operator: "equals",
        value: "no",
        decision: "refer",
        message:
          "An uncorrected product defect from a prior claim requires underwriter review.",
      },
    ],
    summaryLabel: "Defect Corrected",
    summarySection: "Loss History",
  },

  {
    id: "claims_largest_amount",
    type: "choice",
    brokerText: "Roughly how large was the biggest claim?",
    helperText: "An approximate amount is fine.",
    options: [
      { label: "Under $50,000", value: "under_50k", emoji: "💵" },
      { label: "$50,000 – $250,000", value: "k50_250", emoji: "💰" },
      { label: "$250,000 – $1,000,000", value: "k250_1m", emoji: "💴" },
      { label: "Over $1,000,000", value: "over_1m", emoji: "⚠️" },
    ],
    defaultNextQuestionId: "deductible",
    underwritingRules: [
      {
        operator: "equals",
        value: "over_1m",
        decision: "refer",
        message:
          "A prior product liability claim exceeding $1,000,000 requires underwriter review.",
      },
    ],
    summaryLabel: "Largest Claim",
    summarySection: "Loss History",
  },

  {
    id: "deductible",
    type: "choice",
    brokerText: "What deductible would you prefer?",
    helperText:
      "A higher deductible lowers your premium but increases your out-of-pocket cost per claim.",
    options: [
      { label: "$5,000 CAD", value: 5000, description: "Higher premium" },
      { label: "$10,000 CAD", value: 10000, description: "Balanced — most popular" },
      { label: "$25,000 CAD", value: 25000, description: "Lower premium" },
      { label: "$50,000 CAD", value: 50000, description: "Lowest premium" },
    ],
    defaultNextQuestionId: "manufacture_country",
    ratingFactor: "deductible",
    summaryLabel: "Deductible",
    summarySection: "Exposure & Coverage",
  },

  // ── MANUFACTURING & QUALITY ──────────────────────────────
  {
    id: "manufacture_country",
    type: "dropdown",
    brokerText: "Where are the cells and packs primarily manufactured?",
    helperText:
      "Country of manufacture affects quality-control maturity and our ability to audit the factory.",
    options: [
      { label: "Canada", value: "canada" },
      { label: "United States", value: "usa" },
      { label: "Western Europe", value: "western_europe" },
      { label: "Japan / South Korea", value: "japan_korea" },
      { label: "China", value: "china" },
      { label: "Other Asia", value: "other_asia" },
      { label: "Other", value: "other" },
    ],
    defaultNextQuestionId: "units_sold_annually",
    ratingFactor: "manufactureCountry",
    summaryLabel: "Country of Manufacture",
    summarySection: "Product",
  },

  {
    id: "units_sold_annually",
    type: "number",
    brokerText:
      "Roughly how many battery units do you sell or distribute per year?",
    helperText:
      "The number of units in the field drives how likely a defective unit is to reach an end user.",
    placeholder: "25,000",
    min: 1,
    max: 50000000,
    mustBeInteger: true,
    defaultNextQuestionId: "sold_in_usa",
    ratingFactor: "unitsSold",
    summaryLabel: "Annual Units Sold",
    summarySection: "Exposure & Coverage",
  },

  {
    id: "sold_in_usa",
    type: "choice",
    brokerText: "Are any of these products sold or distributed in the USA?",
    helperText:
      "US product-liability litigation is materially more severe, so US exposure affects pricing.",
    options: [
      { label: "No — not sold in the USA", value: "none", emoji: "🚫" },
      { label: "Yes — some US distribution", value: "some", emoji: "🌎" },
      { label: "Yes — USA is the primary market", value: "primary", emoji: "🇺🇸", description: "Requires review" },
    ],
    defaultNextQuestionId: "un38_3_compliance",
    underwritingRules: [
      {
        operator: "equals",
        value: "primary",
        decision: "refer",
        message:
          "Products whose primary market is the USA carry elevated litigation severity and require individual underwriter review.",
      },
    ],
    ratingFactor: "usaSales",
    summaryLabel: "Sold in USA",
    summarySection: "Exposure & Coverage",
  },

  {
    id: "un38_3_compliance",
    type: "choice",
    brokerText:
      "Are the cells UN38.3 tested for safe transport?",
    helperText:
      "UN38.3 is the mandatory transport-safety test for lithium cells and packs.",
    options: [
      { label: "Yes — all SKUs tested", value: "yes", emoji: "✅", description: "Best rate" },
      { label: "Partially — some SKUs untested", value: "partial", emoji: "⚠️" },
      { label: "No — not UN38.3 compliant", value: "no", emoji: "🚫", description: "Requires review" },
    ],
    defaultNextQuestionId: "third_party_testing",
    underwritingRules: [
      {
        operator: "equals",
        value: "no",
        decision: "refer",
        message:
          "Cells without UN38.3 transport certification require underwriter review of the supply chain and shipping practices.",
      },
    ],
    ratingFactor: "un383",
    summaryLabel: "UN38.3 Compliant",
    summarySection: "Product",
  },

  {
    id: "third_party_testing",
    type: "choice",
    brokerText:
      "How is the product independently safety-tested?",
    helperText:
      "Ongoing independent batch testing attracts the strongest terms.",
    options: [
      { label: "Ongoing independent batch testing", value: "ongoing", emoji: "🔬", description: "Best rate" },
      { label: "Initial type-test only", value: "initial", emoji: "🧾" },
      { label: "No independent testing", value: "none", emoji: "🚫", description: "Requires review" },
    ],
    defaultNextQuestionId: "batch_traceability",
    underwritingRules: [
      {
        operator: "equals",
        value: "none",
        decision: "refer",
        message:
          "Products with no independent safety testing require underwriter review.",
      },
    ],
    ratingFactor: "thirdPartyTesting",
    summaryLabel: "Independent Testing",
    summarySection: "Product",
  },

  {
    id: "batch_traceability",
    type: "choice",
    brokerText:
      "What level of batch / serial traceability do you maintain?",
    helperText:
      "Traceability limits the scope and cost of a recall by isolating affected units.",
    options: [
      { label: "Full per-unit / batch traceability", value: "full", emoji: "🏆", description: "Best rate" },
      { label: "Batch-level only", value: "partial", emoji: "📦" },
      { label: "No traceability", value: "none", emoji: "🚫" },
    ],
    defaultNextQuestionId: "contact_phone",
    ratingFactor: "traceability",
    summaryLabel: "Batch Traceability",
    summarySection: "Product",
  },

  // ── CONTACT ──────────────────────────────────────────────
  {
    id: "contact_phone",
    type: "text",
    inputType: "phone",
    brokerText:
      "Almost done, {{applicant_name}}! What's the best phone number to reach the business?",
    helperText: "We'll only use this to discuss the quote if needed.",
    placeholder: "e.g. (416) 555-0142",
    defaultNextQuestionId: "contact_email",
    required: true,
    summaryLabel: "Phone",
    summarySection: "Contact",
  },

  {
    id: "contact_email",
    type: "text",
    inputType: "email",
    brokerText:
      "And last one — what email address should we send the quote to?",
    helperText: "We'll email a copy of the full quote summary.",
    placeholder: "you@example.com",
    defaultNextQuestionId: "__SUBMIT__",
    required: true,
    summaryLabel: "Email",
    summarySection: "Contact",
  },
];

export const BATTERY_FIRST_QUESTION_ID = "applicant_name";
