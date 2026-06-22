import { Question } from "@/types";

// ============================================================
// ARCHITECTS & ENGINEERS (PROFESSIONAL INDEMNITY) — QUESTION FLOW
// ============================================================
// Mirrors the jeweller-block question schema. Answer ids are mapped
// to rating factors in architectsEngineersQuoteCalculator.ts and to
// decline/refer triggers via underwritingRules below.
//
// NOTE: `applicant_name`, `contact_phone`, and `contact_email` reuse
// the same ids as the other flows so the persistence layer maps them
// to the universal Submission columns without special-casing.
// ============================================================

export const AE_QUESTIONS: Question[] = [
  // ── INTRODUCTION ─────────────────────────────────────────
  {
    id: "applicant_name",
    type: "text",
    inputType: "name",
    brokerText:
      "Hi there! 👋 I'm Alex, your virtual insurance broker. I'll put together a Professional Indemnity quote for your architecture or engineering practice in just a few minutes. What's your name?",
    helperText: "Just your first name is perfectly fine.",
    placeholder: "e.g. Daniel",
    defaultNextQuestionId: "firm_name",
    required: true,
    summaryLabel: "Contact Name",
    summarySection: "Firm",
  },

  // ── FIRM PROFILE ─────────────────────────────────────────
  {
    id: "firm_name",
    type: "text",
    inputType: "text",
    brokerText:
      "Great to meet you, {{applicant_name}}! What's the name of the firm we're quoting?",
    helperText: "The legal or trading name of the practice.",
    placeholder: "e.g. Northgate Design Partners",
    defaultNextQuestionId: "business_province",
    required: true,
    summaryLabel: "Firm Name",
    summarySection: "Firm",
  },

  {
    id: "business_province",
    type: "dropdown",
    brokerText: "Which province or territory is the firm based in?",
    helperText: "We write Professional Indemnity across Canada.",
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
    defaultNextQuestionId: "discipline",
    underwritingRules: [
      {
        operator: "in_list",
        value: ["NT", "NU", "YT"],
        decision: "refer",
        message:
          "Firms in the Northern Territories and Nunavut require individual underwriter review due to remote project conditions and limited local infrastructure.",
      },
    ],
    ratingFactor: "province",
    summaryLabel: "Province",
    summarySection: "Firm",
  },

  {
    id: "discipline",
    type: "choice",
    brokerText: "What's the firm's primary discipline?",
    helperText: "Pick the area that drives most of your fee income.",
    options: [
      { label: "Architecture", value: "architecture", emoji: "📐" },
      { label: "Structural Engineering", value: "structural", emoji: "🏗️" },
      { label: "Civil Engineering", value: "civil", emoji: "🛣️" },
      { label: "Mechanical / Electrical Eng", value: "mech_elec", emoji: "⚙️" },
      { label: "Multi-Discipline", value: "multi", emoji: "🧩" },
      { label: "Other", value: "other", emoji: "❓" },
    ],
    defaultNextQuestionId: "annual_fee_income",
    underwritingRules: [
      {
        operator: "in_list",
        value: ["structural", "civil"],
        decision: "refer",
        message:
          "Structural and civil engineering are higher-hazard disciplines (load-bearing and infrastructure design) and require individual underwriter review.",
      },
    ],
    ratingFactor: "discipline",
    summaryLabel: "Discipline",
    summarySection: "Firm",
  },

  // ── EXPOSURE & EXPERIENCE ────────────────────────────────
  {
    id: "annual_fee_income",
    type: "currency",
    brokerText:
      "What is the firm's estimated annual fee income (in CAD)? This is the main driver of your premium.",
    helperText:
      "Gross professional fees billed over the last 12 months, across all projects.",
    placeholder: "1,500,000",
    min: 25000,
    max: 100000000,
    prefix: "$",
    defaultNextQuestionId: "years_practising",
    underwritingRules: [
      {
        operator: "greater_than",
        value: 25000000,
        decision: "refer",
        message:
          "Annual fee income exceeding $25,000,000 CAD requires senior underwriter approval and a review of the firm's project profile.",
      },
    ],
    ratingFactor: "feeIncome",
    summaryLabel: "Annual Fee Income",
    summarySection: "Exposure",
  },

  {
    id: "years_practising",
    type: "number",
    brokerText: "How many years has the firm been practising?",
    helperText: "An approximate number is fine.",
    placeholder: "e.g. 12",
    min: 0,
    max: 150,
    suffix: "yrs",
    noGrouping: true,
    defaultNextQuestionId: "structural_forensic_pct",
    underwritingRules: [
      {
        operator: "less_than",
        value: 2,
        decision: "refer",
        message:
          "Newly established firms (under 2 years practising) require underwriter review of principals' track record and supervision.",
      },
    ],
    ratingFactor: "yearsPractising",
    summaryLabel: "Years Practising",
    summarySection: "Exposure",
  },

  {
    id: "structural_forensic_pct",
    type: "choice",
    brokerText:
      "What portion of the firm's work involves structural design or forensic / expert-witness engagements?",
    helperText:
      "These are the highest-hazard activities for a PI policy.",
    options: [
      { label: "None", value: "none", emoji: "✅", description: "Best rate" },
      { label: "Under 25%", value: "under_25", emoji: "🟢" },
      { label: "25–50%", value: "25_50", emoji: "🟡", description: "Surcharge" },
      { label: "Over 50%", value: "over_50", emoji: "🔴", description: "Requires review" },
    ],
    defaultNextQuestionId: "coverage_limit",
    underwritingRules: [
      {
        operator: "equals",
        value: "over_50",
        decision: "refer",
        message:
          "A work mix that is more than 50% structural or forensic engagements is high-hazard and requires individual underwriter review.",
      },
    ],
    ratingFactor: "workMix",
    summaryLabel: "Structural / Forensic Work",
    summarySection: "Exposure",
  },

  // ── COVERAGE ─────────────────────────────────────────────
  {
    id: "coverage_limit",
    type: "choice",
    brokerText:
      "What limit of Professional Indemnity cover would you like? This is the most we'd pay on a single claim.",
    helperText:
      "Many public-sector and large private clients mandate a minimum PI limit in their contracts.",
    options: [
      { label: "$250,000 CAD", value: 250000, description: "Lowest premium" },
      { label: "$500,000 CAD", value: 500000 },
      { label: "$1,000,000 CAD", value: 1000000, description: "Most popular" },
      { label: "$2,000,000 CAD", value: 2000000 },
      { label: "$5,000,000 CAD", value: 5000000, description: "Highest premium" },
    ],
    defaultNextQuestionId: "has_qa_process",
    ratingFactor: "coverageLimit",
    summaryLabel: "PI Limit",
    summarySection: "Coverage",
  },

  {
    id: "has_qa_process",
    type: "toggle",
    brokerText:
      "Does the firm have a documented quality-assurance and peer-review process for its deliverables?",
    helperText:
      "Formal QA / peer review materially reduces the risk of a professional-negligence claim.",
    options: [
      { label: "Yes — documented QA / peer review", value: "yes" },
      { label: "No", value: "no" },
    ],
    defaultNextQuestionId: "prior_claims",
    underwritingRules: [
      {
        operator: "equals",
        value: "no",
        decision: "refer",
        message:
          "No documented QA process — the absence of a formal quality-assurance and peer-review procedure requires underwriter review.",
      },
    ],
    ratingFactor: "qaProcess",
    summaryLabel: "Documented QA / Peer Review",
    summarySection: "Risk Management",
  },

  // ── CLAIMS HISTORY ───────────────────────────────────────
  {
    id: "prior_claims",
    type: "choice",
    brokerText:
      "How many professional-liability claims or circumstances has the firm had in the last 5 years?",
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
          "Three or more professional-liability claims within 5 years requires manual underwriter review.",
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
      "What was the nature of the most recent professional liability claim?",
    options: [
      { label: "Design error or defect", value: "design_error", emoji: "📐" },
      { label: "Negligent advice / omission", value: "negligent_advice", emoji: "⚖️" },
      { label: "Missed deadline / delay", value: "missed_deadline", emoji: "⏰" },
      { label: "Breach of contract", value: "breach_contract", emoji: "📄" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "claims_resolved",
    conditionalBranches: [
      { when: { questionId: "prior_claims", operator: "equals", value: 2 },    nextQuestionId: "claim_2_cause" },
      { when: { questionId: "prior_claims", operator: "equals", value: "3+" }, nextQuestionId: "claim_2_cause" },
    ],
    summaryLabel: "Claim 1 — Nature",
    summarySection: "Loss History",
  },

  {
    id: "claim_2_cause",
    type: "choice",
    brokerText:
      "What was the nature of the second professional liability claim?",
    options: [
      { label: "Design error or defect", value: "design_error", emoji: "📐" },
      { label: "Negligent advice / omission", value: "negligent_advice", emoji: "⚖️" },
      { label: "Missed deadline / delay", value: "missed_deadline", emoji: "⏰" },
      { label: "Breach of contract", value: "breach_contract", emoji: "📄" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "claims_resolved",
    conditionalBranches: [
      { when: { questionId: "prior_claims", operator: "equals", value: "3+" }, nextQuestionId: "claim_3_cause" },
    ],
    summaryLabel: "Claim 2 — Nature",
    summarySection: "Loss History",
  },

  {
    id: "claim_3_cause",
    type: "choice",
    brokerText:
      "What was the nature of the third professional liability claim?",
    options: [
      { label: "Design error or defect", value: "design_error", emoji: "📐" },
      { label: "Negligent advice / omission", value: "negligent_advice", emoji: "⚖️" },
      { label: "Missed deadline / delay", value: "missed_deadline", emoji: "⏰" },
      { label: "Breach of contract", value: "breach_contract", emoji: "📄" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "claims_resolved",
    summaryLabel: "Claim 3 — Nature",
    summarySection: "Loss History",
  },

  {
    id: "claims_resolved",
    type: "toggle",
    brokerText: "Have these matters been fully resolved and closed?",
    options: [
      { label: "Yes — resolved and closed", value: "yes" },
      { label: "No — still open", value: "no" },
    ],
    defaultNextQuestionId: "claims_largest_amount",
    underwritingRules: [
      {
        operator: "equals",
        value: "no",
        decision: "refer",
        message:
          "An open professional liability matter requires underwriter review.",
      },
    ],
    summaryLabel: "Matters Resolved",
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
          "A prior professional liability claim exceeding $1,000,000 requires underwriter review.",
      },
    ],
    summaryLabel: "Largest Claim",
    summarySection: "Loss History",
  },

  {
    id: "deductible",
    type: "choice",
    brokerText: "What deductible would you prefer per claim?",
    helperText:
      "A higher deductible lowers your premium but increases your out-of-pocket cost per claim.",
    options: [
      { label: "$5,000 CAD", value: 5000, description: "Higher premium" },
      { label: "$10,000 CAD", value: 10000, description: "Balanced — most popular" },
      { label: "$25,000 CAD", value: 25000, description: "Lower premium" },
      { label: "$50,000 CAD", value: 50000, description: "Lowest premium" },
    ],
    defaultNextQuestionId: "staff_count",
    ratingFactor: "deductible",
    summaryLabel: "Deductible",
    summarySection: "Coverage",
  },

  // ── FIRM SCALE & RISK MANAGEMENT ─────────────────────────
  {
    id: "staff_count",
    type: "number",
    brokerText:
      "How many qualified professionals and technical staff does the firm employ?",
    helperText: "Include architects, engineers, designers and drafting staff.",
    placeholder: "e.g. 8",
    min: 1,
    max: 5000,
    suffix: "staff",
    noGrouping: true,
    mustBeInteger: true,
    defaultNextQuestionId: "high_risk_project_pct",
    ratingFactor: "staffCount",
    summaryLabel: "Professional / Technical Staff",
    summarySection: "Exposure",
  },

  {
    id: "high_risk_project_pct",
    type: "choice",
    brokerText:
      "What share of the firm's work is on high-risk project types — condominiums, bridges, foundations or other heavy structures?",
    helperText:
      "These project types generate the most severe professional-indemnity claims.",
    options: [
      { label: "None", value: "none", emoji: "✅", description: "Best rate" },
      { label: "Under 25%", value: "under_25", emoji: "🟢" },
      { label: "25–50%", value: "25_50", emoji: "🟡", description: "Surcharge" },
      { label: "Over 50%", value: "over_50", emoji: "🔴", description: "Requires review" },
    ],
    defaultNextQuestionId: "written_contracts_limitation",
    underwritingRules: [
      {
        operator: "equals",
        value: "over_50",
        decision: "refer",
        message:
          "More than 50% of work on high-risk project types (condos, bridges, foundations) is high-hazard and requires individual underwriter review.",
      },
    ],
    ratingFactor: "highRiskProjects",
    summaryLabel: "High-Risk Project Share",
    summarySection: "Exposure",
  },

  {
    id: "written_contracts_limitation",
    type: "choice",
    brokerText:
      "How often does the firm use written contracts that include a limitation-of-liability clause?",
    helperText:
      "Written contracts with capped liability are one of the strongest defences against a PI claim.",
    options: [
      { label: "Always — on all engagements", value: "always", emoji: "✅", description: "Best rate" },
      { label: "Sometimes", value: "sometimes", emoji: "🟡" },
      { label: "Never / no written contracts", value: "never", emoji: "🔴", description: "Requires review" },
    ],
    defaultNextQuestionId: "pct_subcontracted",
    underwritingRules: [
      {
        operator: "equals",
        value: "never",
        decision: "refer",
        message:
          "Operating without written contracts or limitation-of-liability clauses materially increases exposure and requires underwriter review.",
      },
    ],
    ratingFactor: "writtenContracts",
    summaryLabel: "Written Contracts / Liability Cap",
    summarySection: "Risk Management",
  },

  {
    id: "pct_subcontracted",
    type: "choice",
    brokerText:
      "What portion of the firm's work is subcontracted out to other design firms or consultants?",
    helperText:
      "Work passed to outside firms still exposes you to vicarious liability.",
    options: [
      { label: "None", value: "none", emoji: "✅" },
      { label: "Under 25%", value: "under_25", emoji: "🟢" },
      { label: "25–50%", value: "25_50", emoji: "🟡" },
      { label: "Over 50%", value: "over_50", emoji: "🟠" },
    ],
    defaultNextQuestionId: "largest_project_value",
    ratingFactor: "subcontracted",
    summaryLabel: "Work Subcontracted Out",
    summarySection: "Exposure",
  },

  {
    id: "largest_project_value",
    type: "choice",
    brokerText:
      "What is the construction value of the largest single project the firm has worked on?",
    helperText: "An approximate figure is fine.",
    options: [
      { label: "Under $1,000,000", value: "under_1m", emoji: "💵" },
      { label: "$1M – $10M", value: "m1_10", emoji: "💰" },
      { label: "$10M – $50M", value: "m10_50", emoji: "💴" },
      { label: "Over $50,000,000", value: "over_50m", emoji: "🏙️" },
    ],
    defaultNextQuestionId: "usa_work",
    ratingFactor: "largestProject",
    summaryLabel: "Largest Project Value",
    summarySection: "Exposure",
  },

  {
    id: "usa_work",
    type: "choice",
    brokerText:
      "Does the firm undertake any projects located in the United States, and if so, how much?",
    helperText:
      "US-based work carries a significantly higher litigation and award severity.",
    options: [
      { label: "None — Canada only", value: "none", emoji: "🇨🇦", description: "Best rate" },
      { label: "Under 25% of work", value: "under_25", emoji: "🟡" },
      { label: "Over 25% of work", value: "over_25", emoji: "🔴", description: "Requires review" },
    ],
    defaultNextQuestionId: "contact_phone",
    underwritingRules: [
      {
        operator: "equals",
        value: "over_25",
        decision: "refer",
        message:
          "Material US project exposure (over 25% of work) carries elevated litigation severity and requires individual underwriter review.",
      },
    ],
    ratingFactor: "usaWork",
    summaryLabel: "US Project Exposure",
    summarySection: "Exposure",
  },

  // ── CONTACT ──────────────────────────────────────────────
  {
    id: "contact_phone",
    type: "text",
    inputType: "phone",
    brokerText:
      "Almost done, {{applicant_name}}! What's the best phone number to reach the firm?",
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

export const AE_FIRST_QUESTION_ID = "applicant_name";
