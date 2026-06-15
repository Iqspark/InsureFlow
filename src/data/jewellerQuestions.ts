import { Question } from "@/types";

// ============================================================
// JEWELLER'S BLOCK — CONVERSATIONAL QUESTION FLOW
// ============================================================
// Mirrors the vacant-home question schema. Answer ids are mapped
// to rating factors in jewellerQuoteCalculator.ts and to
// decline/refer triggers via underwritingRules below.
//
// NOTE: `applicant_name` and `contact_email` reuse the same ids
// as the vacant-home flow so the persistence layer maps them to
// the universal Submission columns without special-casing.
// ============================================================

export const JEWELLER_QUESTIONS: Question[] = [
  // ── INTRODUCTION ─────────────────────────────────────────
  {
    id: "applicant_name",
    type: "text",
    inputType: "name",
    brokerText:
      "Hi there! 👋 I'm Alex, your virtual insurance broker. I'll put together a Jeweller's Block quote for your business in just a few minutes. What's your name?",
    helperText: "Just your first name is perfectly fine.",
    placeholder: "e.g. Priya",
    defaultNextQuestionId: "business_type",
    required: true,
    summaryLabel: "Contact Name",
    summarySection: "Business",
  },

  // ── BUSINESS PROFILE ─────────────────────────────────────
  {
    id: "business_type",
    type: "choice",
    brokerText:
      "Great to meet you, {{applicant_name}}! What best describes the jewellery business?",
    options: [
      { label: "Retail Jeweller", value: "retail", emoji: "💍" },
      { label: "Wholesaler / Dealer", value: "wholesale", emoji: "📦" },
      { label: "Manufacturer", value: "manufacturer", emoji: "🛠️" },
      { label: "Pawnbroker", value: "pawnbroker", emoji: "🏷️" },
      { label: "Online-Only Seller", value: "online_only", emoji: "💻" },
    ],
    defaultNextQuestionId: "business_province",
    underwritingRules: [
      {
        operator: "equals",
        value: "pawnbroker",
        decision: "refer",
        message:
          "Pawnbroking operations fall into a specialist high-risk class and require individual underwriter review.",
      },
      {
        operator: "equals",
        value: "online_only",
        decision: "refer",
        message:
          "Online-only sellers lack a fixed retail security envelope and require underwriter review of stock handling and fulfilment controls.",
      },
    ],
    ratingFactor: "businessType",
    summaryLabel: "Business Type",
    summarySection: "Business",
  },

  {
    id: "business_province",
    type: "dropdown",
    brokerText: "Which province or territory is the business located in?",
    helperText: "We write Jeweller's Block across Canada.",
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
    defaultNextQuestionId: "years_in_business",
    underwritingRules: [
      {
        operator: "in_list",
        value: ["NT", "NU", "YT"],
        decision: "refer",
        message:
          "Businesses in the Northern Territories and Nunavut require individual underwriter review due to remoteness and limited security/response infrastructure.",
      },
    ],
    ratingFactor: "province",
    summaryLabel: "Province",
    summarySection: "Business",
  },

  {
    id: "years_in_business",
    type: "number",
    brokerText: "How many years has the business been trading?",
    helperText: "An approximate number is fine.",
    placeholder: "e.g. 8",
    min: 0,
    max: 150,
    suffix: "yrs",
    defaultNextQuestionId: "max_stock_value",
    underwritingRules: [
      {
        operator: "less_than",
        value: 1,
        decision: "refer",
        message:
          "Newly established businesses (under 1 year trading) require underwriter review of management experience and controls.",
      },
    ],
    ratingFactor: "yearsInBusiness",
    summaryLabel: "Years Trading",
    summarySection: "Business",
  },

  // ── STOCK & COVERAGE ─────────────────────────────────────
  {
    id: "max_stock_value",
    type: "currency",
    brokerText:
      "What is the maximum value of stock (in CAD) on the premises at any one time? This becomes your sum insured.",
    helperText:
      "Include all jewellery, loose gemstones, and precious metals at their replacement cost — at the highest point in your trading cycle.",
    placeholder: "500,000",
    min: 25000,
    max: 20000000,
    prefix: "$",
    defaultNextQuestionId: "stock_in_safe",
    underwritingRules: [
      {
        operator: "greater_than",
        value: 5000000,
        decision: "refer",
        message:
          "A maximum stock value exceeding $5,000,000 CAD requires senior underwriter approval and a survey of the protections.",
      },
    ],
    ratingFactor: "maxStockValue",
    summaryLabel: "Max Stock Value",
    summarySection: "Stock & Coverage",
  },

  {
    id: "stock_in_safe",
    type: "choice",
    brokerText:
      "Overnight, what portion of the stock is locked away in a rated safe or vault?",
    helperText:
      "Most insurers require the great majority of stock to be in a rated safe outside business hours.",
    options: [
      { label: "All of it (100%)", value: "all", emoji: "🔒", description: "Best rate" },
      { label: "Most (75–99%)", value: "most", emoji: "✅", description: "Standard" },
      { label: "About half (50–74%)", value: "half", emoji: "⚠️", description: "Surcharge" },
      { label: "Less than half", value: "under_half", emoji: "❗", description: "Requires review" },
      { label: "None — left out", value: "none", emoji: "🚫", description: "Outside appetite" },
    ],
    defaultNextQuestionId: "safe_rating",
    underwritingRules: [
      {
        operator: "equals",
        value: "none",
        decision: "decline",
        message:
          "Stock left unsecured overnight (not locked in a rated safe or vault) falls outside our underwriting appetite.",
      },
      {
        operator: "equals",
        value: "under_half",
        decision: "refer",
        message:
          "Leaving more than half of the stock outside a rated safe overnight requires underwriter review.",
      },
    ],
    ratingFactor: "stockInSafe",
    summaryLabel: "Stock in Safe Overnight",
    summarySection: "Security",
  },

  {
    id: "safe_rating",
    type: "choice",
    brokerText: "What grade of safe or vault protects the stock?",
    options: [
      { label: "High-grade vault (TL-30 / TRTL)", value: "vault_high", emoji: "🏦", description: "Best rate" },
      { label: "Rated jewellers' safe (TL-15)", value: "rated_safe", emoji: "🔐", description: "Standard" },
      { label: "Fire safe only", value: "fire_safe", emoji: "🧯", description: "Not burglary-rated" },
      { label: "Locking cabinet / showcase only", value: "cabinet", emoji: "🗄️", description: "Requires review" },
      { label: "No secure container", value: "none", emoji: "🚫", description: "Outside appetite" },
    ],
    defaultNextQuestionId: "alarm_type",
    underwritingRules: [
      {
        operator: "equals",
        value: "none",
        decision: "decline",
        message:
          "A jewellery risk with no burglary-rated safe or vault falls outside our underwriting appetite.",
      },
      {
        operator: "equals",
        value: "cabinet",
        decision: "refer",
        message:
          "Reliance on a locking cabinet or showcase alone (no rated safe) requires underwriter review.",
      },
    ],
    ratingFactor: "safeRating",
    summaryLabel: "Safe / Vault Grade",
    summarySection: "Security",
  },

  {
    id: "alarm_type",
    type: "choice",
    brokerText: "What burglar alarm protects the premises?",
    helperText:
      "Central-station (UL/ULC) monitoring with safe/vault contacts attracts the best terms.",
    options: [
      { label: "Central station + safe contacts", value: "central_safe", emoji: "📡", description: "Best rate" },
      { label: "Central station (premises only)", value: "central_premises", emoji: "🛰️", description: "Standard" },
      { label: "Local audible alarm only", value: "local_only", emoji: "🔔", description: "Requires review" },
      { label: "No alarm", value: "none", emoji: "🚫", description: "Outside appetite" },
    ],
    defaultNextQuestionId: "window_display_value",
    underwritingRules: [
      {
        operator: "equals",
        value: "none",
        decision: "decline",
        message:
          "A jewellery premises with no burglar alarm falls outside our underwriting appetite.",
      },
      {
        operator: "equals",
        value: "local_only",
        decision: "refer",
        message:
          "A local audible alarm without central-station monitoring requires underwriter review; most markets mandate monitored alarms for jewellers.",
      },
    ],
    ratingFactor: "alarmType",
    summaryLabel: "Burglar Alarm",
    summarySection: "Security",
  },

  {
    id: "window_display_value",
    type: "choice",
    brokerText:
      "After hours, how much stock value is left in the display windows?",
    helperText:
      "Emptying windows nightly sharply reduces smash-and-grab exposure.",
    options: [
      { label: "Windows emptied nightly", value: "emptied", emoji: "🌙", description: "Best rate" },
      { label: "Under $10k left in", value: "under_10k", emoji: "💵" },
      { label: "$10k – $50k left in", value: "k10_50", emoji: "💰" },
      { label: "Over $50k left in", value: "over_50k", emoji: "⚠️", description: "Requires review" },
    ],
    defaultNextQuestionId: "carries_stock_offsite",
    underwritingRules: [
      {
        operator: "equals",
        value: "over_50k",
        decision: "refer",
        message:
          "Leaving more than $50,000 CAD of stock in display windows after hours creates significant smash-and-grab exposure and requires underwriter review.",
      },
    ],
    ratingFactor: "windowDisplay",
    summaryLabel: "Stock in Windows After Hours",
    summarySection: "Security",
  },

  // ── OFF-PREMISES / TRANSIT ───────────────────────────────
  {
    id: "carries_stock_offsite",
    type: "toggle",
    brokerText:
      "Do you regularly take stock off the premises — to trade shows, customers, or for deliveries?",
    helperText:
      "Stock in transit and at temporary locations is a distinct exposure under a Jeweller's Block policy.",
    options: [
      { label: "Yes — stock travels off-site", value: "yes" },
      { label: "No — stock stays on premises", value: "no" },
    ],
    defaultNextQuestionId: "prior_losses",
    conditionalBranches: [
      { when: { operator: "equals", value: "yes" }, nextQuestionId: "offsite_value" },
    ],
    ratingFactor: "carriesOffsite",
    summaryLabel: "Carries Stock Off-Site",
    summarySection: "Off-Premises",
  },

  {
    id: "offsite_value",
    type: "choice",
    brokerText:
      "What is the most stock value carried off the premises at any one time?",
    options: [
      { label: "Under $25k", value: "under_25k", emoji: "🧳" },
      { label: "$25k – $100k", value: "k25_100", emoji: "💼" },
      { label: "Over $100k", value: "over_100k", emoji: "⚠️", description: "Requires review" },
    ],
    defaultNextQuestionId: "prior_losses",
    underwritingRules: [
      {
        operator: "equals",
        value: "over_100k",
        decision: "refer",
        message:
          "Carrying more than $100,000 CAD of stock off-premises requires underwriter review of conveyance and security arrangements.",
      },
    ],
    ratingFactor: "offsiteValue",
    summaryLabel: "Max Value Carried Off-Site",
    summarySection: "Off-Premises",
  },

  // ── LOSS HISTORY ─────────────────────────────────────────
  {
    id: "prior_losses",
    type: "choice",
    brokerText:
      "How many theft, burglary, or robbery losses has the business had in the last 5 years?",
    options: [
      { label: "None", value: 0, emoji: "✅" },
      { label: "1 loss", value: 1, emoji: "1️⃣" },
      { label: "2 losses", value: 2, emoji: "2️⃣" },
      { label: "3 or more", value: "3+", emoji: "⚠️" },
    ],
    defaultNextQuestionId: "deductible",
    conditionalBranches: [
      { when: { operator: "equals", value: 1 },    nextQuestionId: "loss_1_cause" },
      { when: { operator: "equals", value: 2 },    nextQuestionId: "loss_1_cause" },
      { when: { operator: "equals", value: "3+" }, nextQuestionId: "loss_1_cause" },
    ],
    underwritingRules: [
      {
        operator: "equals",
        value: "3+",
        decision: "refer",
        message:
          "Three or more theft/burglary/robbery losses within 5 years requires manual underwriter review.",
      },
    ],
    ratingFactor: "priorLosses",
    summaryLabel: "Losses (5 yrs)",
    summarySection: "Loss History",
  },

  // ── LOSS DETAILS — asked only when 1+ prior losses ──────
  // The number of "cause" questions scales with the loss count
  // (1 → loss_1, 2 → loss_1/2, 3+ → loss_1/2/3), then two shared
  // follow-ups about remediation and severity.
  {
    id: "loss_1_cause",
    type: "choice",
    brokerText: "What was the nature of the most recent loss?",
    options: [
      { label: "Burglary (forced entry)", value: "burglary", emoji: "🔨" },
      { label: "Robbery (hold-up)", value: "robbery", emoji: "🔫" },
      { label: "Theft (employee / shoplifting)", value: "theft", emoji: "🦹" },
      { label: "Mysterious disappearance", value: "disappearance", emoji: "❓" },
      { label: "In-transit loss", value: "transit", emoji: "🚚" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "losses_addressed",
    conditionalBranches: [
      { when: { questionId: "prior_losses", operator: "equals", value: 2 },    nextQuestionId: "loss_2_cause" },
      { when: { questionId: "prior_losses", operator: "equals", value: "3+" }, nextQuestionId: "loss_2_cause" },
    ],
    summaryLabel: "Loss 1 — Type",
    summarySection: "Loss History",
  },

  {
    id: "loss_2_cause",
    type: "choice",
    brokerText: "What was the nature of the second loss?",
    options: [
      { label: "Burglary (forced entry)", value: "burglary", emoji: "🔨" },
      { label: "Robbery (hold-up)", value: "robbery", emoji: "🔫" },
      { label: "Theft (employee / shoplifting)", value: "theft", emoji: "🦹" },
      { label: "Mysterious disappearance", value: "disappearance", emoji: "❓" },
      { label: "In-transit loss", value: "transit", emoji: "🚚" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "losses_addressed",
    conditionalBranches: [
      { when: { questionId: "prior_losses", operator: "equals", value: "3+" }, nextQuestionId: "loss_3_cause" },
    ],
    summaryLabel: "Loss 2 — Type",
    summarySection: "Loss History",
  },

  {
    id: "loss_3_cause",
    type: "choice",
    brokerText: "What was the nature of the third loss?",
    options: [
      { label: "Burglary (forced entry)", value: "burglary", emoji: "🔨" },
      { label: "Robbery (hold-up)", value: "robbery", emoji: "🔫" },
      { label: "Theft (employee / shoplifting)", value: "theft", emoji: "🦹" },
      { label: "Mysterious disappearance", value: "disappearance", emoji: "❓" },
      { label: "In-transit loss", value: "transit", emoji: "🚚" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "losses_addressed",
    summaryLabel: "Loss 3 — Type",
    summarySection: "Loss History",
  },

  {
    id: "losses_addressed",
    type: "toggle",
    brokerText:
      "Have the security weaknesses behind these losses been corrected?",
    options: [
      { label: "Yes — corrected", value: "yes" },
      { label: "No — still outstanding", value: "no" },
    ],
    defaultNextQuestionId: "losses_largest_amount",
    underwritingRules: [
      {
        operator: "equals",
        value: "no",
        decision: "refer",
        message:
          "Uncorrected security weaknesses behind a prior loss require underwriter review.",
      },
    ],
    summaryLabel: "Weaknesses Corrected",
    summarySection: "Loss History",
  },

  {
    id: "losses_largest_amount",
    type: "choice",
    brokerText: "Roughly how large was the biggest loss?",
    helperText: "An approximate amount is fine.",
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
          "A prior loss exceeding $500,000 CAD requires underwriter review.",
      },
    ],
    summaryLabel: "Largest Loss",
    summarySection: "Loss History",
  },

  {
    id: "deductible",
    type: "choice",
    brokerText: "What deductible would you prefer?",
    helperText:
      "A higher deductible lowers your premium but increases your out-of-pocket cost per claim.",
    options: [
      { label: "$2,500 CAD", value: 2500, description: "Higher premium" },
      { label: "$5,000 CAD", value: 5000, description: "Balanced — most popular" },
      { label: "$10,000 CAD", value: 10000, description: "Lower premium" },
      { label: "$25,000 CAD", value: 25000, description: "Lowest premium" },
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

export const JEWELLER_FIRST_QUESTION_ID = "applicant_name";
