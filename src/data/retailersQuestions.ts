import { Question } from "@/types";

// ============================================================
// RETAILERS (COMMERCIAL PACKAGE) — CONVERSATIONAL QUESTION FLOW
// ============================================================
// Property + general liability package for a retail store. Answer
// ids are mapped to rating factors in retailersQuoteCalculator.ts
// and to decline/refer triggers via underwritingRules below.
//
// NOTE: `applicant_name`, `contact_phone` and `contact_email`
// reuse the same ids as the other flows so the persistence layer
// maps them to the universal Submission columns without
// special-casing.
// ============================================================

export const RETAIL_QUESTIONS: Question[] = [
  // ── INTRODUCTION ─────────────────────────────────────────
  {
    id: "applicant_name",
    type: "text",
    inputType: "name",
    brokerText:
      "Hi there! 👋 I'm Alex, your virtual insurance broker. I'll put together a Retailers commercial package quote for your store in just a few minutes. What's your name?",
    helperText: "Just your first name is perfectly fine.",
    placeholder: "e.g. Sam",
    defaultNextQuestionId: "business_name",
    required: true,
    summaryLabel: "Contact Name",
    summarySection: "Business",
  },

  // ── BUSINESS PROFILE ─────────────────────────────────────
  {
    id: "business_name",
    type: "text",
    inputType: "text",
    brokerText:
      "Great to meet you, {{applicant_name}}! What's the name of the business we're insuring?",
    helperText: "The legal or trading name of the store.",
    placeholder: "e.g. Maple Street Goods Ltd.",
    defaultNextQuestionId: "business_province",
    required: true,
    summaryLabel: "Business Name",
    summarySection: "Business",
  },

  {
    id: "business_province",
    type: "dropdown",
    brokerText: "Which province or territory is the store located in?",
    helperText: "We write retail commercial packages across Canada.",
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
    defaultNextQuestionId: "store_type",
    underwritingRules: [
      {
        operator: "in_list",
        value: ["NT", "NU", "YT"],
        decision: "refer",
        message:
          "Stores in the Northern Territories and Nunavut require individual underwriter review due to remoteness and limited fire/emergency response infrastructure.",
      },
    ],
    ratingFactor: "province",
    summaryLabel: "Province",
    summarySection: "Business",
  },

  {
    id: "store_type",
    type: "choice",
    brokerText: "What best describes the store?",
    options: [
      { label: "Apparel / Footwear", value: "apparel", emoji: "👕" },
      { label: "Electronics", value: "electronics", emoji: "📱" },
      { label: "Grocery / Convenience", value: "grocery", emoji: "🛒" },
      { label: "Furniture / Homeware", value: "furniture", emoji: "🛋️" },
      { label: "Hardware", value: "hardware", emoji: "🔧" },
      { label: "Restaurant / Cafe", value: "restaurant", emoji: "☕" },
      { label: "Cannabis Retail", value: "cannabis", emoji: "🌿" },
      { label: "Other", value: "other", emoji: "🏬" },
    ],
    defaultNextQuestionId: "building_construction",
    underwritingRules: [
      {
        operator: "equals",
        value: "cannabis",
        decision: "refer",
        message:
          "Cannabis retail is a regulated specialist class and requires individual underwriter review of licensing and security controls.",
      },
    ],
    ratingFactor: "storeType",
    summaryLabel: "Store Type",
    summarySection: "Business",
  },

  {
    id: "building_construction",
    type: "choice",
    brokerText: "What is the building primarily constructed of?",
    helperText: "Construction type affects the fire and weather exposure.",
    options: [
      { label: "Masonry / Concrete", value: "masonry", emoji: "🧱", description: "Best rate" },
      { label: "Mixed", value: "mixed", emoji: "🏗️", description: "Standard" },
      { label: "Wood Frame", value: "wood_frame", emoji: "🪵", description: "Surcharge" },
    ],
    defaultNextQuestionId: "annual_turnover",
    ratingFactor: "construction",
    summaryLabel: "Construction",
    summarySection: "Property",
  },

  {
    id: "annual_turnover",
    type: "currency",
    brokerText:
      "What is the store's approximate annual turnover (in CAD)?",
    helperText:
      "Total annual sales revenue. This drives the general liability portion of the premium.",
    placeholder: "750,000",
    min: 0,
    max: 100000000,
    prefix: "$",
    defaultNextQuestionId: "stock_contents_value",
    ratingFactor: "turnover",
    summaryLabel: "Annual Turnover",
    summarySection: "Business",
  },

  // ── STOCK & COVERAGE ─────────────────────────────────────
  {
    id: "stock_contents_value",
    type: "currency",
    brokerText:
      "What is the total value of stock and contents (in CAD) at the store? This becomes your sum insured.",
    helperText:
      "Include all inventory, fixtures, fittings, and equipment at their replacement cost.",
    placeholder: "300,000",
    min: 10000,
    max: 20000000,
    prefix: "$",
    defaultNextQuestionId: "fire_protection",
    underwritingRules: [
      {
        operator: "greater_than",
        value: 5000000,
        decision: "refer",
        message:
          "A stock and contents sum insured exceeding $5,000,000 CAD requires senior underwriter approval and a survey of the protections.",
      },
    ],
    ratingFactor: "stockContentsValue",
    summaryLabel: "Stock & Contents Value",
    summarySection: "Stock & Coverage",
  },

  {
    id: "fire_protection",
    type: "choice",
    brokerText: "What fire protection is in place at the store?",
    helperText:
      "Sprinklers with a monitored alarm attract the best terms.",
    options: [
      { label: "Sprinklered + monitored alarm", value: "sprinklered_monitored", emoji: "🚿", description: "Best rate" },
      { label: "Monitored alarm only", value: "monitored_alarm", emoji: "🚨", description: "Standard" },
      { label: "Extinguishers only", value: "extinguishers", emoji: "🧯", description: "Surcharge" },
      { label: "None", value: "none", emoji: "🚫", description: "Outside appetite" },
    ],
    defaultNextQuestionId: "burglar_alarm",
    underwritingRules: [
      {
        operator: "equals",
        value: "none",
        decision: "decline",
        message:
          "A retail premises with no fire protection falls outside our underwriting appetite.",
      },
    ],
    ratingFactor: "fireProtection",
    summaryLabel: "Fire Protection",
    summarySection: "Security",
  },

  {
    id: "burglar_alarm",
    type: "choice",
    brokerText: "What burglar alarm protects the premises?",
    helperText:
      "Central-station monitoring attracts the best terms.",
    options: [
      { label: "Central station", value: "central", emoji: "📡", description: "Best rate" },
      { label: "Local only", value: "local", emoji: "🔔", description: "Surcharge" },
      { label: "None", value: "none", emoji: "🚫", description: "Requires review" },
    ],
    defaultNextQuestionId: "prior_claims",
    underwritingRules: [
      {
        operator: "equals",
        value: "none",
        decision: "refer",
        message:
          "A retail premises with no burglar alarm requires underwriter review of theft controls.",
      },
    ],
    ratingFactor: "burglarAlarm",
    summaryLabel: "Burglar Alarm",
    summarySection: "Security",
  },

  // ── LOSS HISTORY ─────────────────────────────────────────
  {
    id: "prior_claims",
    type: "choice",
    brokerText:
      "How many insurance claims has the business had in the last 5 years?",
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
          "Three or more claims within 5 years requires manual underwriter review.",
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
      { label: "Theft / burglary", value: "theft", emoji: "🦹" },
      { label: "Fire / smoke", value: "fire", emoji: "🔥" },
      { label: "Water damage", value: "water", emoji: "💧" },
      { label: "Customer injury (liability)", value: "liability", emoji: "⚖️" },
      { label: "Vandalism", value: "vandalism", emoji: "🧨" },
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
      { label: "Theft / burglary", value: "theft", emoji: "🦹" },
      { label: "Fire / smoke", value: "fire", emoji: "🔥" },
      { label: "Water damage", value: "water", emoji: "💧" },
      { label: "Customer injury (liability)", value: "liability", emoji: "⚖️" },
      { label: "Vandalism", value: "vandalism", emoji: "🧨" },
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
      { label: "Theft / burglary", value: "theft", emoji: "🦹" },
      { label: "Fire / smoke", value: "fire", emoji: "🔥" },
      { label: "Water damage", value: "water", emoji: "💧" },
      { label: "Customer injury (liability)", value: "liability", emoji: "⚖️" },
      { label: "Vandalism", value: "vandalism", emoji: "🧨" },
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
      "Have the damages / issues from these claims been fully resolved?",
    options: [
      { label: "Yes — fully resolved", value: "yes" },
      { label: "No — still outstanding", value: "no" },
    ],
    defaultNextQuestionId: "claims_largest_amount",
    underwritingRules: [
      {
        operator: "equals",
        value: "no",
        decision: "refer",
        message:
          "Unresolved damage from a prior claim requires underwriter review.",
      },
    ],
    summaryLabel: "Claims Resolved",
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
          "A prior claim exceeding $500,000 requires underwriter review.",
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
    defaultNextQuestionId: "contact_phone",
    ratingFactor: "deductible",
    summaryLabel: "Deductible",
    summarySection: "Stock & Coverage",
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

export const RETAIL_FIRST_QUESTION_ID = "applicant_name";
