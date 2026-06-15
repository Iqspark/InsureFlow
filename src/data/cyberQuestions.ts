import { Question } from "@/types";

// ============================================================
// CYBER LIABILITY — CONVERSATIONAL QUESTION FLOW
// ============================================================
// Mirrors the jeweller-block / vacant-home question schema.
// Answer ids are mapped to rating factors in
// cyberQuoteCalculator.ts and to decline/refer triggers via
// underwritingRules below.
//
// NOTE: `applicant_name`, `contact_phone`, and `contact_email`
// reuse the same ids as the other flows so the persistence layer
// maps them to the universal Submission columns without
// special-casing.
// ============================================================

export const CYBER_QUESTIONS: Question[] = [
  // ── INTRODUCTION ─────────────────────────────────────────
  {
    id: "applicant_name",
    type: "text",
    inputType: "name",
    brokerText:
      "Hi there! 👋 I'm Alex, your virtual insurance broker. I'll put together a Cyber Liability quote for your business in just a few minutes. What's your name?",
    helperText: "Just your first name is perfectly fine.",
    placeholder: "e.g. Daniel",
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
      "Great to meet you, {{applicant_name}}! What's the legal name of the company we're insuring?",
    helperText: "As it appears on your incorporation documents.",
    placeholder: "e.g. Northwind Technologies Inc.",
    defaultNextQuestionId: "industry",
    required: true,
    summaryLabel: "Company Name",
    summarySection: "Business",
  },

  {
    id: "industry",
    type: "choice",
    brokerText: "What industry does the business operate in?",
    helperText: "This shapes the threat profile we underwrite against.",
    options: [
      { label: "Professional Services", value: "professional", emoji: "💼" },
      { label: "Retail / E-commerce", value: "retail", emoji: "🛒" },
      { label: "Healthcare", value: "healthcare", emoji: "🏥", description: "Requires review" },
      { label: "Financial", value: "financial", emoji: "🏦", description: "Requires review" },
      { label: "Manufacturing", value: "manufacturing", emoji: "🏭" },
      { label: "Technology / SaaS", value: "technology", emoji: "💻" },
      { label: "Other", value: "other", emoji: "🏢" },
    ],
    defaultNextQuestionId: "annual_revenue",
    underwritingRules: [
      {
        operator: "equals",
        value: "healthcare",
        decision: "refer",
        message:
          "Healthcare operations hold large volumes of regulated health information (PHI) and require individual underwriter review.",
      },
      {
        operator: "equals",
        value: "financial",
        decision: "refer",
        message:
          "Financial-sector risks face heightened regulatory and threat-actor exposure and require individual underwriter review.",
      },
    ],
    ratingFactor: "industry",
    summaryLabel: "Industry",
    summarySection: "Business",
  },

  {
    id: "annual_revenue",
    type: "currency",
    brokerText:
      "What is the company's annual revenue (in CAD)? This is a primary driver of cyber exposure.",
    helperText:
      "Use your most recent full-year figure — a close estimate is fine.",
    placeholder: "5,000,000",
    min: 0,
    max: 1000000000,
    prefix: "$",
    defaultNextQuestionId: "records_held",
    underwritingRules: [
      {
        operator: "greater_than",
        value: 250000000,
        decision: "refer",
        message:
          "Annual revenue exceeding $250,000,000 CAD requires senior underwriter approval and a detailed risk survey.",
      },
    ],
    ratingFactor: "annualRevenue",
    summaryLabel: "Annual Revenue",
    summarySection: "Business",
  },

  // ── DATA EXPOSURE ────────────────────────────────────────
  {
    id: "records_held",
    type: "choice",
    brokerText:
      "Roughly how many sensitive records (PII / PCI) does the business store?",
    helperText:
      "Include customer, employee, and payment records held electronically.",
    options: [
      { label: "Under 10k", value: "under_10k", emoji: "🗂️", description: "Best rate" },
      { label: "10k – 100k", value: "k10_100", emoji: "📁" },
      { label: "100k – 1M", value: "k100_1m", emoji: "📚", description: "Surcharge" },
      { label: "Over 1M", value: "over_1m", emoji: "🗄️", description: "Requires review" },
    ],
    defaultNextQuestionId: "coverage_limit",
    underwritingRules: [
      {
        operator: "equals",
        value: "over_1m",
        decision: "refer",
        message:
          "Holding more than 1,000,000 sensitive records creates a large aggregation exposure and requires underwriter review.",
      },
    ],
    ratingFactor: "recordsHeld",
    summaryLabel: "Sensitive Records Held",
    summarySection: "Data Exposure",
  },

  // ── COVERAGE ─────────────────────────────────────────────
  {
    id: "coverage_limit",
    type: "choice",
    brokerText:
      "What aggregate policy limit would you like? This is the most we'll pay across all claims in the policy year.",
    helperText:
      "Higher limits raise the premium but provide more protection after a major breach.",
    options: [
      { label: "$250,000 CAD", value: 250000, description: "Lowest premium" },
      { label: "$500,000 CAD", value: 500000, description: "Balanced" },
      { label: "$1,000,000 CAD", value: 1000000, description: "Most popular" },
      { label: "$3,000,000 CAD", value: 3000000, description: "Higher protection" },
      { label: "$5,000,000 CAD", value: 5000000, description: "Highest protection" },
    ],
    defaultNextQuestionId: "mfa_enabled",
    ratingFactor: "coverageLimit",
    summaryLabel: "Aggregate Limit",
    summarySection: "Coverage",
  },

  // ── SECURITY CONTROLS ────────────────────────────────────
  {
    id: "mfa_enabled",
    type: "toggle",
    brokerText:
      "Is multi-factor authentication (MFA) enforced for email, remote access, and admin accounts?",
    helperText:
      "MFA is the single most effective control against account takeover and ransomware — most markets mandate it.",
    options: [
      { label: "Yes — MFA enforced", value: "yes" },
      { label: "No — not enforced", value: "no" },
    ],
    defaultNextQuestionId: "backups",
    underwritingRules: [
      {
        operator: "equals",
        value: "no",
        decision: "refer",
        message:
          "MFA not enforced. Multi-factor authentication is a baseline control; risks without it require underwriter review.",
      },
    ],
    ratingFactor: "mfaEnabled",
    summaryLabel: "MFA Enforced",
    summarySection: "Security Controls",
  },

  {
    id: "backups",
    type: "choice",
    brokerText: "How does the business back up its critical data?",
    helperText:
      "Tested, offline or immutable backups are the key to recovering from ransomware without paying.",
    options: [
      { label: "Tested offline / immutable backups", value: "immutable", emoji: "🛡️", description: "Best rate" },
      { label: "Regular backups", value: "regular", emoji: "💾", description: "Standard" },
      { label: "No backups", value: "none", emoji: "🚫", description: "Outside appetite" },
    ],
    defaultNextQuestionId: "endpoint_security",
    underwritingRules: [
      {
        operator: "equals",
        value: "none",
        decision: "decline",
        message:
          "A business with no data backups cannot recover from ransomware and falls outside our underwriting appetite.",
      },
    ],
    ratingFactor: "backups",
    summaryLabel: "Data Backups",
    summarySection: "Security Controls",
  },

  {
    id: "endpoint_security",
    type: "choice",
    brokerText: "What endpoint protection is deployed across company devices?",
    options: [
      { label: "EDR / managed detection", value: "edr", emoji: "📡", description: "Best rate" },
      { label: "Standard antivirus", value: "standard_av", emoji: "🦠", description: "Standard" },
      { label: "None", value: "none", emoji: "🚫", description: "Requires review" },
    ],
    defaultNextQuestionId: "prior_incidents",
    underwritingRules: [
      {
        operator: "equals",
        value: "none",
        decision: "refer",
        message:
          "No endpoint protection deployed. Risks without antivirus or EDR require underwriter review of remediation plans.",
      },
    ],
    ratingFactor: "endpointSecurity",
    summaryLabel: "Endpoint Security",
    summarySection: "Security Controls",
  },

  // ── LOSS HISTORY ─────────────────────────────────────────
  {
    id: "prior_incidents",
    type: "choice",
    brokerText:
      "How many cyber incidents or breaches has the business had in the last 5 years?",
    helperText: "Include ransomware, data breaches, and funds-transfer fraud.",
    options: [
      { label: "None", value: 0, emoji: "✅" },
      { label: "1 incident", value: 1, emoji: "1️⃣" },
      { label: "2 incidents", value: 2, emoji: "2️⃣" },
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
          "Three or more cyber incidents within 5 years requires manual underwriter review.",
      },
    ],
    ratingFactor: "priorIncidents",
    summaryLabel: "Incidents (5 yrs)",
    summarySection: "Loss History",
  },

  // ── INCIDENT DETAILS — asked only when 1+ prior incidents ──
  {
    id: "claim_1_cause",
    type: "choice",
    brokerText: "What was the nature of the most recent cyber incident?",
    options: [
      { label: "Ransomware", value: "ransomware", emoji: "🔒" },
      { label: "Data breach (records exposed)", value: "data_breach", emoji: "📂" },
      { label: "Funds-transfer fraud / BEC", value: "funds_fraud", emoji: "💸" },
      { label: "System outage / DDoS", value: "outage", emoji: "🌐" },
      { label: "Insider or employee error", value: "insider", emoji: "👤" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "claims_resolved",
    conditionalBranches: [
      { when: { questionId: "prior_incidents", operator: "equals", value: 2 },    nextQuestionId: "claim_2_cause" },
      { when: { questionId: "prior_incidents", operator: "equals", value: "3+" }, nextQuestionId: "claim_2_cause" },
    ],
    underwritingRules: [
      {
        operator: "equals",
        value: "ransomware",
        decision: "refer",
        message:
          "A prior ransomware incident requires underwriter review of current controls.",
      },
    ],
    summaryLabel: "Incident 1 — Type",
    summarySection: "Loss History",
  },

  {
    id: "claim_2_cause",
    type: "choice",
    brokerText: "What was the nature of the second cyber incident?",
    options: [
      { label: "Ransomware", value: "ransomware", emoji: "🔒" },
      { label: "Data breach (records exposed)", value: "data_breach", emoji: "📂" },
      { label: "Funds-transfer fraud / BEC", value: "funds_fraud", emoji: "💸" },
      { label: "System outage / DDoS", value: "outage", emoji: "🌐" },
      { label: "Insider or employee error", value: "insider", emoji: "👤" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "claims_resolved",
    conditionalBranches: [
      { when: { questionId: "prior_incidents", operator: "equals", value: "3+" }, nextQuestionId: "claim_3_cause" },
    ],
    underwritingRules: [
      {
        operator: "equals",
        value: "ransomware",
        decision: "refer",
        message:
          "A prior ransomware incident requires underwriter review of current controls.",
      },
    ],
    summaryLabel: "Incident 2 — Type",
    summarySection: "Loss History",
  },

  {
    id: "claim_3_cause",
    type: "choice",
    brokerText: "What was the nature of the third cyber incident?",
    options: [
      { label: "Ransomware", value: "ransomware", emoji: "🔒" },
      { label: "Data breach (records exposed)", value: "data_breach", emoji: "📂" },
      { label: "Funds-transfer fraud / BEC", value: "funds_fraud", emoji: "💸" },
      { label: "System outage / DDoS", value: "outage", emoji: "🌐" },
      { label: "Insider or employee error", value: "insider", emoji: "👤" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "claims_resolved",
    underwritingRules: [
      {
        operator: "equals",
        value: "ransomware",
        decision: "refer",
        message:
          "A prior ransomware incident requires underwriter review of current controls.",
      },
    ],
    summaryLabel: "Incident 3 — Type",
    summarySection: "Loss History",
  },

  {
    id: "claims_resolved",
    type: "toggle",
    brokerText:
      "Have the vulnerabilities behind these incidents been fully remediated?",
    options: [
      { label: "Yes — fully remediated", value: "yes" },
      { label: "No — remediation outstanding", value: "no" },
    ],
    defaultNextQuestionId: "claims_largest_amount",
    underwritingRules: [
      {
        operator: "equals",
        value: "no",
        decision: "refer",
        message:
          "Unremediated vulnerabilities from a prior incident require underwriter review.",
      },
    ],
    summaryLabel: "Vulnerabilities Remediated",
    summarySection: "Loss History",
  },

  {
    id: "claims_largest_amount",
    type: "choice",
    brokerText: "Roughly how large was the biggest incident (total cost)?",
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
          "A prior cyber incident exceeding $500,000 requires underwriter review.",
      },
    ],
    summaryLabel: "Largest Incident",
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

export const CYBER_FIRST_QUESTION_ID = "applicant_name";
