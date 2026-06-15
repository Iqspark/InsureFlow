import { Question } from "@/types";

// ============================================================
// RENTAL HOMES (LANDLORD) — CONVERSATIONAL QUESTION FLOW
// ============================================================
// Mirrors the vacant-home / jeweller question schema. Answer ids
// are mapped to rating factors in rentalHomeQuoteCalculator.ts and
// to decline/refer triggers via underwritingRules below.
//
// NOTE: `applicant_name`, `contact_phone`, and `contact_email`
// reuse the same ids as the other flows so the persistence layer
// maps them to the universal Submission columns without
// special-casing. All other answers live in the allAnswers JSON.
// ============================================================

export const RENTAL_QUESTIONS: Question[] = [
  // ── INTRODUCTION ─────────────────────────────────────────
  {
    id: "applicant_name",
    type: "text",
    inputType: "name",
    brokerText:
      "Hi there! 👋 I'm Alex, your virtual insurance broker. I'll put together a Rental Homes (Landlord) quote for your rental property in just a few minutes. What's your name?",
    helperText: "Just your first name is perfectly fine.",
    placeholder: "e.g. Daniel",
    defaultNextQuestionId: "rental_province",
    required: true,
    summaryLabel: "Contact Name",
    summarySection: "Landlord",
  },

  // ── PROPERTY LOCATION & TYPE ─────────────────────────────
  {
    id: "rental_province",
    type: "dropdown",
    brokerText:
      "Great to meet you, {{applicant_name}}! Which province or territory is the rental property in?",
    helperText: "We write Landlord cover across Canada.",
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
    defaultNextQuestionId: "property_type",
    underwritingRules: [
      {
        operator: "in_list",
        value: ["NT", "NU", "YT"],
        decision: "refer",
        message:
          "Rental properties in the Northern Territories and Nunavut require individual underwriter review due to remoteness and limited response infrastructure.",
      },
    ],
    ratingFactor: "province",
    summaryLabel: "Province",
    summarySection: "Property",
  },

  {
    id: "property_type",
    type: "choice",
    brokerText: "What type of property is being rented out?",
    options: [
      { label: "Detached House", value: "detached", emoji: "🏠" },
      { label: "Semi / Townhouse", value: "semi_townhouse", emoji: "🏘️" },
      { label: "Condo Unit", value: "condo", emoji: "🏢" },
      { label: "Multi-Unit (2–4)", value: "multi_2_4", emoji: "🏬" },
      { label: "Apartment Block (5+)", value: "apartment_5plus", emoji: "🏨", description: "Commercial review" },
    ],
    defaultNextQuestionId: "year_built",
    underwritingRules: [
      {
        operator: "equals",
        value: "apartment_5plus",
        decision: "refer",
        message:
          "Apartment blocks of 5 or more units are a commercial habitational risk and require individual underwriter review under our commercial property facility.",
      },
    ],
    ratingFactor: "propertyType",
    summaryLabel: "Property Type",
    summarySection: "Property",
  },

  {
    id: "year_built",
    type: "number",
    noGrouping: true,
    brokerText: "What year was the property built?",
    helperText: "An approximate year is fine.",
    placeholder: "e.g. 1998",
    min: 1850,
    max: 2026,
    defaultNextQuestionId: "rebuild_value",
    underwritingRules: [
      {
        operator: "less_than",
        value: 1950,
        decision: "refer",
        message:
          "Properties built before 1950 require underwriter review of wiring (knob-and-tube) and plumbing updates.",
      },
    ],
    ratingFactor: "yearBuilt",
    summaryLabel: "Year Built",
    summarySection: "Property",
  },

  // ── COVERAGE ─────────────────────────────────────────────
  {
    id: "rebuild_value",
    type: "currency",
    brokerText:
      "What is the estimated rebuild cost (in CAD) of the property? This becomes your sum insured.",
    helperText:
      "Use the replacement/reconstruction cost of the building — not the market or land value.",
    placeholder: "450,000",
    min: 75000,
    max: 5000000,
    prefix: "$",
    defaultNextQuestionId: "tenant_type",
    underwritingRules: [
      {
        operator: "greater_than",
        value: 2000000,
        decision: "refer",
        message:
          "A rebuild value exceeding $2,000,000 CAD requires senior underwriter approval and may need a property survey.",
      },
    ],
    ratingFactor: "rebuildValue",
    summaryLabel: "Rebuild Value",
    summarySection: "Coverage",
  },

  // ── TENANCY ──────────────────────────────────────────────
  {
    id: "tenant_type",
    type: "choice",
    brokerText: "Who are the tenants?",
    helperText: "The tenancy profile affects the risk of damage and loss.",
    options: [
      { label: "Long-term Family", value: "long_term_family", emoji: "👨‍👩‍👧", description: "Best rate" },
      { label: "Professionals", value: "professionals", emoji: "💼", description: "Standard" },
      { label: "Students", value: "students", emoji: "🎓", description: "Surcharge" },
      { label: "Short-term / Airbnb", value: "short_term", emoji: "🛎️", description: "Requires review" },
      { label: "Subsidized / DSS", value: "subsidized", emoji: "🏤" },
    ],
    defaultNextQuestionId: "occupancy_status",
    underwritingRules: [
      {
        operator: "equals",
        value: "short_term",
        decision: "refer",
        message:
          "Short-term and Airbnb lettings have a commercial occupancy exposure and require underwriter review of turnover and guest controls.",
      },
    ],
    ratingFactor: "tenantType",
    summaryLabel: "Tenant Type",
    summarySection: "Tenancy",
  },

  {
    id: "occupancy_status",
    type: "choice",
    brokerText: "What is the current occupancy of the property?",
    options: [
      { label: "Fully Occupied", value: "fully_occupied", emoji: "✅", description: "Best rate" },
      { label: "Partially Occupied", value: "partially_occupied", emoji: "🔸" },
      { label: "Currently Vacant", value: "vacant", emoji: "🚫", description: "Use Vacant Home product" },
    ],
    defaultNextQuestionId: "prior_claims",
    underwritingRules: [
      {
        operator: "equals",
        value: "vacant",
        decision: "refer",
        message:
          "A currently vacant property is not eligible for Landlord cover — please use the Vacant Home product instead.",
      },
    ],
    ratingFactor: "occupancyStatus",
    summaryLabel: "Occupancy",
    summarySection: "Tenancy",
  },

  // ── LOSS HISTORY ─────────────────────────────────────────
  {
    id: "prior_claims",
    type: "choice",
    brokerText:
      "How many property claims has this rental had in the last 5 years?",
    options: [
      { label: "None", value: 0, emoji: "✅" },
      { label: "1 claim", value: 1, emoji: "1️⃣" },
      { label: "2 claims", value: 2, emoji: "2️⃣" },
      { label: "3 or more", value: "3+", emoji: "⚠️" },
    ],
    defaultNextQuestionId: "smoke_alarms",
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
          "Three or more property claims within 5 years requires manual underwriter review.",
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
    brokerText: "What was the cause of the most recent claim?",
    options: [
      { label: "Water / plumbing", value: "water", emoji: "💧" },
      { label: "Fire / smoke", value: "fire", emoji: "🔥" },
      { label: "Tenant damage / vandalism", value: "tenant_damage", emoji: "🧨" },
      { label: "Tenant injury (liability)", value: "liability", emoji: "⚖️" },
      { label: "Weather (wind, hail, storm)", value: "weather", emoji: "🌪️" },
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
        message: "A prior fire loss requires underwriter review.",
      },
    ],
    summaryLabel: "Claim 1 — Cause",
    summarySection: "Loss History",
  },

  {
    id: "claim_2_cause",
    type: "choice",
    brokerText: "What was the cause of the second claim?",
    options: [
      { label: "Water / plumbing", value: "water", emoji: "💧" },
      { label: "Fire / smoke", value: "fire", emoji: "🔥" },
      { label: "Tenant damage / vandalism", value: "tenant_damage", emoji: "🧨" },
      { label: "Tenant injury (liability)", value: "liability", emoji: "⚖️" },
      { label: "Weather (wind, hail, storm)", value: "weather", emoji: "🌪️" },
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
        message: "A prior fire loss requires underwriter review.",
      },
    ],
    summaryLabel: "Claim 2 — Cause",
    summarySection: "Loss History",
  },

  {
    id: "claim_3_cause",
    type: "choice",
    brokerText: "What was the cause of the third claim?",
    options: [
      { label: "Water / plumbing", value: "water", emoji: "💧" },
      { label: "Fire / smoke", value: "fire", emoji: "🔥" },
      { label: "Tenant damage / vandalism", value: "tenant_damage", emoji: "🧨" },
      { label: "Tenant injury (liability)", value: "liability", emoji: "⚖️" },
      { label: "Weather (wind, hail, storm)", value: "weather", emoji: "🌪️" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "claims_resolved",
    underwritingRules: [
      {
        operator: "equals",
        value: "fire",
        decision: "refer",
        message: "A prior fire loss requires underwriter review.",
      },
    ],
    summaryLabel: "Claim 3 — Cause",
    summarySection: "Loss History",
  },

  {
    id: "claims_resolved",
    type: "toggle",
    brokerText:
      "Have all damages from these claims been fully repaired?",
    options: [
      { label: "Yes — fully repaired", value: "yes" },
      { label: "No — repairs still outstanding", value: "no" },
    ],
    defaultNextQuestionId: "claims_largest_amount",
    underwritingRules: [
      {
        operator: "equals",
        value: "no",
        decision: "refer",
        message:
          "Unrepaired damage from a prior claim requires underwriter review.",
      },
    ],
    summaryLabel: "Damages Repaired",
    summarySection: "Loss History",
  },

  {
    id: "claims_largest_amount",
    type: "choice",
    brokerText: "Roughly how large was the biggest claim?",
    options: [
      { label: "Under $10,000", value: "under_10k", emoji: "💵" },
      { label: "$10,000 – $25,000", value: "k10_25", emoji: "💰" },
      { label: "$25,000 – $50,000", value: "k25_50", emoji: "💴" },
      { label: "Over $50,000", value: "over_50k", emoji: "⚠️" },
    ],
    defaultNextQuestionId: "smoke_alarms",
    underwritingRules: [
      {
        operator: "equals",
        value: "over_50k",
        decision: "refer",
        message:
          "A prior claim exceeding $50,000 requires underwriter review.",
      },
    ],
    summaryLabel: "Largest Claim",
    summarySection: "Loss History",
  },

  // ── SAFETY ───────────────────────────────────────────────
  {
    id: "smoke_alarms",
    type: "toggle",
    brokerText:
      "Are there working smoke and carbon-monoxide alarms throughout the property?",
    helperText:
      "Working alarms are a minimum requirement for habitational cover.",
    options: [
      { label: "Yes — alarms are working", value: "yes" },
      { label: "No — not all working", value: "no" },
    ],
    defaultNextQuestionId: "deductible",
    underwritingRules: [
      {
        operator: "equals",
        value: "no",
        decision: "refer",
        message:
          "Working smoke and CO alarms are required throughout a rental property; missing or non-working alarms require underwriter review before cover can be offered.",
      },
    ],
    ratingFactor: "smokeAlarms",
    summaryLabel: "Working Alarms",
    summarySection: "Safety",
  },

  // ── DEDUCTIBLE ───────────────────────────────────────────
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
    defaultNextQuestionId: "contact_phone",
    ratingFactor: "deductible",
    summaryLabel: "Deductible",
    summarySection: "Coverage",
  },

  // ── CONTACT ──────────────────────────────────────────────
  {
    id: "contact_phone",
    type: "text",
    inputType: "phone",
    brokerText:
      "Almost done, {{applicant_name}}! What's the best phone number to reach you?",
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

export const RENTAL_FIRST_QUESTION_ID = "applicant_name";
