import { Question } from "@/types";

// ============================================================
// CONTRACTOR (GENERAL LIABILITY) — CONVERSATIONAL QUESTION FLOW
// ============================================================
// Mirrors the jeweller-block question schema. Answer ids are
// mapped to rating factors in contractorQuoteCalculator.ts and to
// decline/refer triggers via underwritingRules below.
//
// NOTE: `applicant_name`, `contact_phone`, and `contact_email`
// reuse the same ids as the other flows so the persistence layer
// maps them to the universal Submission columns without
// special-casing.
// ============================================================

export const CONTRACTOR_QUESTIONS: Question[] = [
  // ── INTRODUCTION ─────────────────────────────────────────
  {
    id: "applicant_name",
    type: "text",
    inputType: "name",
    brokerText:
      "Hi there! 👋 I'm Alex, your virtual insurance broker. I'll put together a Contractor General Liability quote for your business in just a few minutes. What's your name?",
    helperText: "Just your first name is perfectly fine.",
    placeholder: "e.g. Marco",
    defaultNextQuestionId: "business_name",
    required: true,
    summaryLabel: "Contact Name",
    summarySection: "Business",
  },

  // ── BUSINESS PROFILE ─────────────────────────────────────
  {
    id: "business_name",
    type: "text",
    brokerText:
      "Great to meet you, {{applicant_name}}! What's the legal or operating name of the contracting business?",
    helperText: "As it appears on your invoices and contracts.",
    placeholder: "e.g. Maple Ridge Contracting Ltd.",
    defaultNextQuestionId: "business_province",
    required: true,
    summaryLabel: "Business Name",
    summarySection: "Business",
  },

  {
    id: "business_province",
    type: "dropdown",
    brokerText: "Which province or territory does the business operate out of?",
    helperText: "We write Contractor GL across Canada.",
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
    defaultNextQuestionId: "trade_type",
    underwritingRules: [
      {
        operator: "in_list",
        value: ["NT", "NU", "YT"],
        decision: "refer",
        message:
          "Contractors operating in the Northern Territories and Nunavut require individual underwriter review due to remoteness and limited claims/response infrastructure.",
      },
    ],
    ratingFactor: "province",
    summaryLabel: "Province",
    summarySection: "Business",
  },

  {
    id: "trade_type",
    type: "choice",
    brokerText: "What trade best describes the work the business performs?",
    helperText: "Pick the one that represents most of your revenue.",
    options: [
      { label: "General Carpentry", value: "carpentry", emoji: "🪚" },
      { label: "Electrical", value: "electrical", emoji: "⚡" },
      { label: "Plumbing / HVAC", value: "plumbing_hvac", emoji: "🔧" },
      { label: "Roofing", value: "roofing", emoji: "🏠", description: "High hazard" },
      { label: "Excavation / Foundation", value: "excavation", emoji: "🚜", description: "High hazard" },
      { label: "Landscaping", value: "landscaping", emoji: "🌳" },
      { label: "Painting / Finishing", value: "painting", emoji: "🎨" },
      { label: "Other", value: "other", emoji: "🧰" },
    ],
    defaultNextQuestionId: "annual_revenue",
    underwritingRules: [
      {
        operator: "in_list",
        value: ["roofing", "excavation"],
        decision: "refer",
        message:
          "Roofing and excavation/foundation work are high-hazard classes (height, collapse, and underground exposures) and require individual underwriter review.",
      },
    ],
    ratingFactor: "tradeType",
    summaryLabel: "Trade Type",
    summarySection: "Business",
  },

  {
    id: "annual_revenue",
    type: "currency",
    brokerText:
      "What is the business's estimated annual revenue (in CAD)? This drives the base premium.",
    helperText:
      "Use your projected gross receipts for the coming policy year — Contractor GL is turnover-rated.",
    placeholder: "750,000",
    min: 25000,
    max: 50000000,
    prefix: "$",
    defaultNextQuestionId: "years_in_business",
    underwritingRules: [
      {
        operator: "greater_than",
        value: 10000000,
        decision: "refer",
        message:
          "Annual revenue exceeding $10,000,000 CAD requires senior underwriter approval and a review of contracts and subcontracting controls.",
      },
    ],
    ratingFactor: "annualRevenue",
    summaryLabel: "Annual Revenue",
    summarySection: "Business",
  },

  {
    id: "years_in_business",
    type: "number",
    brokerText: "How many years has the business been operating?",
    helperText: "An approximate number is fine.",
    placeholder: "e.g. 6",
    min: 0,
    max: 150,
    suffix: "yrs",
    noGrouping: true,
    defaultNextQuestionId: "subcontractor_use",
    underwritingRules: [
      {
        operator: "less_than",
        value: 1,
        decision: "refer",
        message:
          "Newly established contractors (under 1 year operating) require underwriter review of management experience and prior work history.",
      },
    ],
    ratingFactor: "yearsInBusiness",
    summaryLabel: "Years Operating",
    summarySection: "Business",
  },

  // ── OPERATIONS ───────────────────────────────────────────
  {
    id: "subcontractor_use",
    type: "choice",
    brokerText: "How often does the business hire subcontractors?",
    helperText:
      "Subcontractors create vicarious liability exposure; we look for certificates of insurance (COIs) on file.",
    options: [
      { label: "None — own crew only", value: "none", emoji: "👷", description: "Best rate" },
      { label: "Occasional, certified subs", value: "occasional", emoji: "✅", description: "Standard" },
      { label: "Frequent subcontracting", value: "frequent", emoji: "⚠️", description: "Requires review" },
    ],
    defaultNextQuestionId: "works_at_height",
    underwritingRules: [
      {
        operator: "equals",
        value: "frequent",
        decision: "refer",
        message:
          "Frequent subcontracting requires underwriter verification that certificates of insurance (COIs) are collected and maintained for all subs.",
      },
    ],
    ratingFactor: "subcontractorUse",
    summaryLabel: "Subcontractor Use",
    summarySection: "Operations",
  },

  {
    id: "works_at_height",
    type: "toggle",
    brokerText:
      "Does the business perform any work above two storeys or more than 6 metres off the ground?",
    helperText:
      "Work at height is a distinct bodily-injury and falling-object exposure under a Contractor GL policy.",
    options: [
      { label: "Yes — we work at height", value: "yes" },
      { label: "No — ground / low level only", value: "no" },
    ],
    defaultNextQuestionId: "coverage_limit",
    conditionalBranches: [
      { when: { operator: "equals", value: "yes" }, nextQuestionId: "height_detail" },
    ],
    ratingFactor: "worksAtHeight",
    summaryLabel: "Works at Height",
    summarySection: "Operations",
  },

  {
    id: "height_detail",
    type: "choice",
    brokerText: "What is the maximum height the crew typically works at?",
    options: [
      { label: "Up to 3 storeys", value: "up_to_3", emoji: "🪜" },
      { label: "3 – 6 storeys", value: "3_to_6", emoji: "🏢", description: "Surcharge" },
      { label: "Over 6 storeys", value: "over_6", emoji: "⚠️", description: "Requires review" },
    ],
    defaultNextQuestionId: "coverage_limit",
    underwritingRules: [
      {
        operator: "equals",
        value: "over_6",
        decision: "refer",
        message:
          "Work above six storeys carries elevated fall and falling-object exposure and requires individual underwriter review.",
      },
    ],
    ratingFactor: "heightDetail",
    summaryLabel: "Max Working Height",
    summarySection: "Operations",
  },

  // ── COVERAGE ─────────────────────────────────────────────
  {
    id: "coverage_limit",
    type: "choice",
    brokerText: "What general liability aggregate limit would you like?",
    helperText:
      "Many general contracts require a minimum $2,000,000 CAD GL aggregate.",
    options: [
      { label: "$1,000,000 CAD", value: 1000000, description: "Lower premium" },
      { label: "$2,000,000 CAD", value: 2000000, description: "Most popular" },
      { label: "$5,000,000 CAD", value: 5000000, description: "Higher limit" },
      { label: "$10,000,000 CAD", value: 10000000, description: "Highest limit" },
    ],
    defaultNextQuestionId: "prior_claims",
    ratingFactor: "coverageLimit",
    summaryLabel: "GL Aggregate Limit",
    summarySection: "Coverage",
  },

  // ── LOSS HISTORY ─────────────────────────────────────────
  {
    id: "prior_claims",
    type: "choice",
    brokerText:
      "How many liability claims has the business had in the last 5 years?",
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
          "Three or more liability claims within 5 years requires manual underwriter review.",
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
    brokerText: "What was the cause of the most recent liability claim?",
    options: [
      { label: "Bodily injury (third party)", value: "bodily_injury", emoji: "🤕" },
      { label: "Property damage", value: "property_damage", emoji: "🏚️" },
      { label: "Faulty / defective work", value: "faulty_work", emoji: "🔧" },
      { label: "Vehicle or equipment", value: "vehicle", emoji: "🚚" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "claims_resolved",
    conditionalBranches: [
      { when: { questionId: "prior_claims", operator: "equals", value: 2 },    nextQuestionId: "claim_2_cause" },
      { when: { questionId: "prior_claims", operator: "equals", value: "3+" }, nextQuestionId: "claim_2_cause" },
    ],
    summaryLabel: "Claim 1 — Cause",
    summarySection: "Loss History",
  },

  {
    id: "claim_2_cause",
    type: "choice",
    brokerText: "What was the cause of the second liability claim?",
    options: [
      { label: "Bodily injury (third party)", value: "bodily_injury", emoji: "🤕" },
      { label: "Property damage", value: "property_damage", emoji: "🏚️" },
      { label: "Faulty / defective work", value: "faulty_work", emoji: "🔧" },
      { label: "Vehicle or equipment", value: "vehicle", emoji: "🚚" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "claims_resolved",
    conditionalBranches: [
      { when: { questionId: "prior_claims", operator: "equals", value: "3+" }, nextQuestionId: "claim_3_cause" },
    ],
    summaryLabel: "Claim 2 — Cause",
    summarySection: "Loss History",
  },

  {
    id: "claim_3_cause",
    type: "choice",
    brokerText: "What was the cause of the third liability claim?",
    options: [
      { label: "Bodily injury (third party)", value: "bodily_injury", emoji: "🤕" },
      { label: "Property damage", value: "property_damage", emoji: "🏚️" },
      { label: "Faulty / defective work", value: "faulty_work", emoji: "🔧" },
      { label: "Vehicle or equipment", value: "vehicle", emoji: "🚚" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "claims_resolved",
    summaryLabel: "Claim 3 — Cause",
    summarySection: "Loss History",
  },

  {
    id: "claims_resolved",
    type: "toggle",
    brokerText: "Have these claims been fully settled and closed?",
    options: [
      { label: "Yes — settled and closed", value: "yes" },
      { label: "No — open or unresolved", value: "no" },
    ],
    defaultNextQuestionId: "claims_largest_amount",
    underwritingRules: [
      {
        operator: "equals",
        value: "no",
        decision: "refer",
        message:
          "An open or unresolved liability claim requires underwriter review.",
      },
    ],
    summaryLabel: "Claims Settled",
    summarySection: "Loss History",
  },

  {
    id: "claims_largest_amount",
    type: "choice",
    brokerText: "Roughly how large was the biggest claim?",
    options: [
      { label: "Under $25,000", value: "under_25k", emoji: "💵" },
      { label: "$25,000 – $100,000", value: "k25_100", emoji: "💰" },
      { label: "$100,000 – $500,000", value: "k100_500", emoji: "💴" },
      { label: "Over $500,000", value: "over_500k", emoji: "⚠️" },
    ],
    defaultNextQuestionId: "deductible",
    underwritingRules: [
      {
        operator: "equals",
        value: "over_500k",
        decision: "refer",
        message:
          "A prior liability claim exceeding $500,000 requires underwriter review.",
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
      { label: "$1,000 CAD", value: 1000, description: "Higher premium" },
      { label: "$2,500 CAD", value: 2500, description: "Balanced — most popular" },
      { label: "$5,000 CAD", value: 5000, description: "Lower premium" },
      { label: "$10,000 CAD", value: 10000, description: "Lowest premium" },
    ],
    defaultNextQuestionId: "residential_commercial",
    ratingFactor: "deductible",
    summaryLabel: "Deductible",
    summarySection: "Coverage",
  },

  // ── ADDITIONAL OPERATIONS DETAIL ─────────────────────────
  {
    id: "residential_commercial",
    type: "choice",
    brokerText: "What type of clients does the business mainly work for?",
    helperText:
      "Residential and commercial work carry different liability and contractual exposures.",
    options: [
      { label: "Mostly residential", value: "residential", emoji: "🏡" },
      { label: "Mix of both", value: "mixed", emoji: "🏘️" },
      { label: "Mostly commercial", value: "commercial", emoji: "🏢" },
      { label: "Industrial / institutional", value: "industrial", emoji: "🏭", description: "Higher exposure" },
    ],
    defaultNextQuestionId: "annual_payroll",
    ratingFactor: "clientType",
    summaryLabel: "Client Type",
    summarySection: "Operations",
  },

  {
    id: "annual_payroll",
    type: "currency",
    brokerText: "What is the business's estimated annual payroll (in CAD)?",
    helperText:
      "Include wages for all employees and working owners — payroll is a key exposure base for a contractor.",
    placeholder: "250,000",
    min: 0,
    max: 25000000,
    prefix: "$",
    defaultNextQuestionId: "subs_carry_insurance",
    ratingFactor: "annualPayroll",
    summaryLabel: "Annual Payroll",
    summarySection: "Operations",
  },

  {
    id: "subs_carry_insurance",
    type: "choice",
    brokerText:
      "Do the subcontractors you hire carry their own general liability insurance?",
    helperText:
      "Uninsured subcontractors expose your policy to their losses; we look for certificates of insurance on every sub.",
    options: [
      { label: "Yes — COIs collected from all subs", value: "all", emoji: "✅", description: "Best rate" },
      { label: "Some do, some don't", value: "some", emoji: "⚠️", description: "Surcharge" },
      { label: "No / not verified", value: "none", emoji: "🚫", description: "Requires review" },
      { label: "Not applicable — no subs", value: "na", emoji: "➖" },
    ],
    defaultNextQuestionId: "largest_job_value",
    underwritingRules: [
      {
        operator: "equals",
        value: "none",
        decision: "refer",
        message:
          "Hiring subcontractors who do not carry (or whose insurance is not verified with certificates) their own general liability coverage materially increases vicarious liability and requires underwriter review.",
      },
    ],
    ratingFactor: "subsInsurance",
    summaryLabel: "Subs Carry Insurance",
    summarySection: "Operations",
  },

  {
    id: "largest_job_value",
    type: "choice",
    brokerText: "What is the value of the largest single job you typically take on?",
    helperText:
      "Larger contracts concentrate exposure and often carry stricter indemnity and hold-harmless terms.",
    options: [
      { label: "Under $50,000", value: "under_50k", emoji: "🔩" },
      { label: "$50,000 – $250,000", value: "k50_250", emoji: "🏗️" },
      { label: "$250,000 – $1,000,000", value: "k250_1m", emoji: "🏢", description: "Surcharge" },
      { label: "Over $1,000,000", value: "over_1m", emoji: "⚠️", description: "Requires review" },
    ],
    defaultNextQuestionId: "hot_works",
    underwritingRules: [
      {
        operator: "equals",
        value: "over_1m",
        decision: "refer",
        message:
          "Single contracts exceeding $1,000,000 concentrate exposure and require underwriter review of the contract terms and indemnity provisions.",
      },
    ],
    ratingFactor: "largestJob",
    summaryLabel: "Largest Single Job",
    summarySection: "Operations",
  },

  {
    id: "hot_works",
    type: "toggle",
    brokerText:
      "Does the business perform any hot works — welding, cutting, soldering, or torch work?",
    helperText:
      "Hot works are a leading cause of construction fire losses and carry a distinct property-damage exposure.",
    options: [
      { label: "Yes — we perform hot works", value: "yes" },
      { label: "No — no hot works", value: "no" },
    ],
    defaultNextQuestionId: "wsib_coverage",
    ratingFactor: "hotWorks",
    summaryLabel: "Hot Works",
    summarySection: "Operations",
  },

  {
    id: "wsib_coverage",
    type: "toggle",
    brokerText:
      "Does the business carry WSIB / WCB workers' compensation coverage for its workers?",
    helperText:
      "Valid workers' compensation coverage is a standard requirement and reduces bodily-injury exposure to the GL policy.",
    options: [
      { label: "Yes — coverage in good standing", value: "yes" },
      { label: "No — no WSIB/WCB coverage", value: "no" },
    ],
    defaultNextQuestionId: "contact_phone",
    underwritingRules: [
      {
        operator: "equals",
        value: "no",
        decision: "refer",
        message:
          "Operating without valid WSIB/WCB workers' compensation coverage shifts injury exposure onto the GL policy and requires underwriter review.",
      },
    ],
    ratingFactor: "wsibCoverage",
    summaryLabel: "WSIB / WCB Coverage",
    summarySection: "Operations",
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

export const CONTRACTOR_FIRST_QUESTION_ID = "applicant_name";
