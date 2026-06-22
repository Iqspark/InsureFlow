import { Question } from "@/types";

// ============================================================
// ██████████████████████████████████████████████████████████
// ██                                                      ██
// ██   PLUGGABLE DATA FILE  —  REPLACE WITH YOUR DATA     ██
// ██                         (CANADIAN MARKET)            ██
// ██████████████████████████████████████████████████████████
//
// EXCEL → JSON COLUMN MAPPING:
//   Col A  →  id                (unique snake_case string, no spaces)
//   Col B  →  type              ('choice'|'text'|'number'|'currency'|'toggle'|'dropdown'|'date')
//   Col C  →  brokerText        (what "Alex" asks — supports {{answer_id}} placeholders)
//   Col D  →  helperText        (optional hint shown below the question)
//   Col E  →  defaultNextQuestionId  (where to go next; '__SUBMIT__' ends the flow)
//   Col F  →  options           (JSON array for choice/toggle/dropdown types)
//   Col G  →  conditionalBranches   (JSON array for branching logic)
//   Col H  →  underwritingRules     (JSON array for decline/refer triggers)
//   Col I  →  ratingFactor      (key used in quoteCalculator.ts)
//
// ============================================================

export const QUESTIONS: Question[] = [
  // ── SECTION 1: INTRODUCTION ──────────────────────────────
  {
    id: "applicant_name",
    type: "text",
    inputType: "name",
    brokerText:
      "Hi there! 👋 I'm Alex, your virtual insurance broker. I can get you a quote for your vacant home in just a few minutes. What's your name?",
    helperText: "Just your first name is perfectly fine.",
    placeholder: "e.g. Sarah",
    defaultNextQuestionId: "property_address",
    required: true,
  },

  // ── SECTION 2: PROPERTY LOCATION & TYPE ──────────────────
  // NOTE: `property_province` is NOT asked in the flow — it is auto-derived
  // from the selected address (see AddressInput). It stays here so the
  // territory underwriting rule, the province rating factor, and the
  // `province` DB column continue to work off the `property_province` answer.
  {
    id: "property_province",
    type: "dropdown",
    brokerText:
      "Which province or territory is the property located in?",
    helperText:
      "We write policies in all Canadian provinces and territories.",
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
    defaultNextQuestionId: "property_address",
    underwritingRules: [
      {
        operator: "in_list",
        value: ["NT", "NU", "YT"],
        decision: "refer",
        message:
          "Properties in the Northern Territories and Nunavut require individual underwriter review due to remoteness and climate exposure.",
      },
    ],
    ratingFactor: "province",
  },

  {
    id: "property_address",
    type: "address",
    brokerText:
      "Great to meet you, {{applicant_name}}! Let's start with the property — what's its full street address?",
    helperText:
      "Start typing and pick the property from the suggestions. We'll fill in the province and show it on the map automatically.",
    placeholder: "123 Main St, Toronto, ON",
    defaultNextQuestionId: "property_type",
    required: true,
  },

  {
    id: "property_type",
    type: "choice",
    brokerText: "What type of property is it?",
    options: [
      { label: "Single Family Home", value: "single_family", emoji: "🏠" },
      { label: "Townhouse", value: "townhouse", emoji: "🏘️" },
      { label: "Condo / Apartment", value: "condo", emoji: "🏢" },
      { label: "Multi-Family (2–4 units)", value: "multi_family", emoji: "🏗️" },
      { label: "Mobile / Manufactured", value: "mobile", emoji: "🚐" },
    ],
    defaultNextQuestionId: "year_built",
    underwritingRules: [
      {
        operator: "equals",
        value: "mobile",
        decision: "decline",
        message:
          "Mobile and manufactured homes fall outside our current underwriting appetite.",
      },
    ],
    ratingFactor: "propertyType",
  },

  // ── SECTION 3: PROPERTY DETAILS ──────────────────────────
  {
    id: "year_built",
    type: "number",
    brokerText: "What year was the property built?",
    helperText: "An approximate year is fine.",
    placeholder: "e.g. 1985",
    min: 1800,
    max: 2025,
    mustBeInteger: true,
    noGrouping: true,
    defaultNextQuestionId: "square_footage",
    underwritingRules: [
      {
        operator: "less_than",
        value: 1900,
        decision: "refer",
        message:
          "Properties built before 1900 require review by one of our senior underwriters.",
      },
    ],
    ratingFactor: "yearBuilt",
  },

  {
    id: "square_footage",
    type: "number",
    brokerText: "Approximately how large is the property?",
    helperText: "Gross interior square footage.",
    placeholder: "e.g. 1,800",
    min: 200,
    max: 20000,
    suffix: "sq ft",
    defaultNextQuestionId: "property_value",
    ratingFactor: "squareFootage",
  },

  // ── SECTION 4: VALUATION ─────────────────────────────────
  {
    id: "property_value",
    type: "currency",
    brokerText:
      "What is the estimated replacement cost (in CAD) to rebuild the property from scratch?",
    helperText:
      "This is the rebuild cost — not the market or purchase price. Your insurer pays this if the home is a total loss.",
    placeholder: "350,000",
    min: 50000,
    max: 10000000,
    prefix: "$",
    defaultNextQuestionId: "coverage_amount",
    underwritingRules: [
      {
        operator: "greater_than",
        value: 3000000,
        decision: "refer",
        message:
          "Properties with a replacement cost exceeding $3,000,000 CAD require senior underwriter approval.",
      },
    ],
    ratingFactor: "propertyValue",
  },

  {
    id: "coverage_amount",
    type: "choice",
    brokerText: "How much dwelling coverage would you like?",
    helperText:
      "We recommend insuring to 100% of the replacement cost to avoid a co-insurance penalty under Canadian insurance law.",
    options: [
      {
        label: "100% of value",
        value: "100",
        emoji: "🛡️",
        description: "Full replacement — recommended",
      },
      {
        label: "90% of value",
        value: "90",
        emoji: "✅",
        description: "Slight savings, small gap",
      },
      {
        label: "80% of value",
        value: "80",
        emoji: "💰",
        description: "Minimum recommended level",
      },
    ],
    defaultNextQuestionId: "deductible",
    ratingFactor: "coveragePercent",
  },

  {
    id: "deductible",
    type: "choice",
    brokerText: "What deductible would you prefer?",
    helperText:
      "A higher deductible lowers your annual premium, but you pay more out of pocket when you make a claim.",
    options: [
      { label: "$1,000 CAD", value: 1000, description: "Higher premium, lower risk" },
      { label: "$2,500 CAD", value: 2500, description: "Balanced — most popular" },
      { label: "$5,000 CAD", value: 5000, description: "Lower premium, moderate risk" },
      { label: "$10,000 CAD", value: 10000, description: "Lowest premium, highest risk" },
    ],
    defaultNextQuestionId: "vacancy_duration",
    ratingFactor: "deductible",
  },

  // ── SECTION 5: VACANCY DETAILS ───────────────────────────
  {
    id: "vacancy_duration",
    type: "choice",
    brokerText: "How long has the property been vacant?",
    options: [
      { label: "Under 6 months", value: "0-6m", emoji: "📅" },
      { label: "6 – 12 months", value: "6-12m", emoji: "📅" },
      { label: "1 – 3 years", value: "1-3y", emoji: "🗓️" },
      { label: "3 – 5 years", value: "3-5y", emoji: "⚠️" },
      { label: "More than 5 years", value: "5y+", emoji: "🚫" },
    ],
    defaultNextQuestionId: "vacancy_reason",
    underwritingRules: [
      {
        operator: "equals",
        value: "5y+",
        decision: "decline",
        message:
          "Properties vacant for more than 5 years fall outside our underwriting guidelines.",
      },
      {
        operator: "equals",
        value: "3-5y",
        decision: "refer",
        message:
          "Properties vacant between 3–5 years require individual underwriter review.",
      },
    ],
    ratingFactor: "vacancyDuration",
  },

  {
    id: "vacancy_reason",
    type: "choice",
    brokerText: "What is the primary reason the property is currently vacant?",
    options: [
      { label: "Listed for Sale", value: "for_sale", emoji: "🏷️" },
      { label: "Estate / Probate", value: "estate", emoji: "⚖️" },
      { label: "Under Renovation", value: "renovation", emoji: "🔨" },
      { label: "Between Tenants", value: "between_tenants", emoji: "🔑" },
      { label: "Owner Relocated", value: "owner_relocated", emoji: "✈️" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "property_inspections",
    ratingFactor: "vacancyReason",
  },

  // ── SECTION 6: PROPERTY MANAGEMENT ──────────────────────
  {
    id: "property_inspections",
    type: "choice",
    brokerText: "How frequently is someone checking on the property?",
    helperText:
      "Regular visits significantly reduce risk — and your premium. Most Canadian insurers require at least monthly inspections for vacant properties.",
    options: [
      { label: "Weekly or more", value: "weekly", emoji: "✅", description: "Best rate discount" },
      { label: "Every 2–4 weeks", value: "monthly", emoji: "📋", description: "Standard rate" },
      { label: "A few times a year", value: "occasional", emoji: "🗓️", description: "Slight surcharge" },
      { label: "Rarely / Never", value: "rarely", emoji: "❌", description: "Requires review" },
    ],
    defaultNextQuestionId: "utilities_winterized",
    underwritingRules: [
      {
        operator: "equals",
        value: "rarely",
        decision: "refer",
        message:
          "Properties with no regular inspections require underwriter review. Note: most Canadian insurers mandate minimum monthly inspections for vacant dwellings.",
      },
    ],
    ratingFactor: "inspectionFrequency",
  },

  {
    id: "utilities_winterized",
    type: "toggle",
    brokerText:
      "Have the utilities been properly shut off or winterized for the Canadian winter?",
    helperText:
      "This includes draining the plumbing, shutting off the water supply at the main, and draining the hot water tank. Freeze damage is the #1 cause of vacant-home claims in Canada.",
    options: [
      { label: "Yes — fully winterized", value: "yes" },
      { label: "No — utilities still active", value: "no" },
    ],
    defaultNextQuestionId: "security_features",
    underwritingRules: [
      {
        operator: "equals",
        value: "no",
        decision: "refer",
        message:
          "Active utilities in a vacant property significantly increase freeze and water damage exposure — manual review required.",
      },
    ],
    ratingFactor: "utilitiesWinterized",
  },

  {
    id: "security_features",
    type: "choice",
    brokerText: "What security measures are currently in place at the property?",
    options: [
      {
        label: "Alarm system + deadbolts",
        value: "alarm_locks",
        emoji: "🔒",
        description: "Premium discount applied",
      },
      {
        label: "Deadbolts only",
        value: "locks_only",
        emoji: "🔑",
        description: "Standard rate",
      },
      {
        label: "Basic locks only",
        value: "basic",
        emoji: "🚪",
        description: "Minor surcharge",
      },
      {
        label: "No security measures",
        value: "none",
        emoji: "⚠️",
        description: "Requires review",
      },
    ],
    defaultNextQuestionId: "has_pool",
    underwritingRules: [
      {
        operator: "equals",
        value: "none",
        decision: "refer",
        message:
          "Properties with no security measures in place require underwriter review.",
      },
    ],
    ratingFactor: "securityFeatures",
  },

  // ── SECTION 7: PROPERTY FEATURES ────────────────────────
  {
    id: "has_pool",
    type: "toggle",
    brokerText: "Does the property have a swimming pool?",
    options: [
      { label: "Yes, it has a pool", value: "yes" },
      { label: "No pool", value: "no" },
    ],
    defaultNextQuestionId: "prior_damage",
    conditionalBranches: [
      {
        when: { operator: "equals", value: "yes" },
        nextQuestionId: "pool_fenced",
      },
    ],
  },

  {
    id: "pool_fenced",
    type: "toggle",
    brokerText: "Is the pool completely enclosed by a fence or barrier?",
    helperText:
      "An unsecured pool on a vacant property is a significant liability exposure. Many Canadian provinces have mandatory pool fencing bylaws.",
    options: [
      { label: "Yes — fully fenced / secured", value: "yes" },
      { label: "No — pool is accessible", value: "no" },
    ],
    defaultNextQuestionId: "prior_damage",
    underwritingRules: [
      {
        operator: "equals",
        value: "no",
        decision: "refer",
        message:
          "An unsecured swimming pool on a vacant property requires underwriter review.",
      },
    ],
    ratingFactor: "pool",
  },

  // ── SECTION 8: LOSS HISTORY ──────────────────────────────
  {
    id: "prior_damage",
    type: "toggle",
    brokerText: "Is there any known existing damage to the property?",
    helperText:
      "E.g. roof damage, foundation cracks, water stains, vandalism, fire or smoke damage, etc.",
    options: [
      { label: "Yes — there is existing damage", value: "yes" },
      { label: "No — property is in good condition", value: "no" },
    ],
    defaultNextQuestionId: "prior_claims",
    conditionalBranches: [
      {
        when: { operator: "equals", value: "yes" },
        nextQuestionId: "damage_type",
      },
    ],
    ratingFactor: "priorDamage",
  },

  {
    id: "damage_type",
    type: "choice",
    brokerText: "What best describes the type of damage?",
    options: [
      { label: "Cosmetic only", value: "cosmetic", emoji: "🎨", description: "Paint, carpet, fixtures" },
      { label: "Minor structural", value: "minor_structural", emoji: "🔧", description: "Minor roof, windows, doors" },
      { label: "Major structural", value: "major_structural", emoji: "⚠️", description: "Roof, foundation, walls" },
      { label: "Fire / Smoke damage", value: "fire", emoji: "🔥", description: "Any fire-related damage" },
      { label: "Water / Flood damage", value: "water", emoji: "💧", description: "Water intrusion or flooding" },
    ],
    defaultNextQuestionId: "prior_claims",
    underwritingRules: [
      {
        operator: "in_list",
        value: ["major_structural", "fire", "water"],
        decision: "refer",
        message:
          "Significant existing damage (structural, fire, or water) requires underwriter review before a policy can be bound.",
      },
    ],
    ratingFactor: "damageType",
  },

  {
    id: "prior_claims",
    type: "choice",
    brokerText:
      "How many insurance claims have been filed on this property in the last 5 years?",
    options: [
      { label: "None", value: 0, emoji: "✅" },
      { label: "1 claim", value: 1, emoji: "1️⃣" },
      { label: "2 claims", value: 2, emoji: "2️⃣" },
      { label: "3 or more", value: "3+", emoji: "⚠️" },
    ],
    defaultNextQuestionId: "prior_insurance",
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
          "Three or more prior claims within 5 years requires manual underwriter review.",
      },
    ],
    ratingFactor: "priorClaims",
  },

  // ── CLAIM DETAILS — asked only when 1+ prior claims ──────
  // The number of "cause" questions scales with the claim count
  // (1 → claim_1, 2 → claim_1/2, 3+ → claim_1/2/3), then two shared
  // follow-ups about remediation and severity.
  {
    id: "claim_1_cause",
    type: "choice",
    brokerText:
      "Let's note a few details for the underwriters. What was the cause of the most recent claim?",
    helperText: "The cause of loss matters more than the count.",
    options: [
      { label: "Water / Plumbing / Freeze", value: "water", emoji: "💧" },
      { label: "Fire / Smoke", value: "fire", emoji: "🔥" },
      { label: "Theft / Vandalism", value: "theft", emoji: "🦹" },
      { label: "Weather (wind, hail, storm)", value: "weather", emoji: "🌪️" },
      { label: "Liability / Injury", value: "liability", emoji: "⚖️" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "claims_repaired",
    conditionalBranches: [
      { when: { questionId: "prior_claims", operator: "equals", value: 2 },    nextQuestionId: "claim_2_cause" },
      { when: { questionId: "prior_claims", operator: "equals", value: "3+" }, nextQuestionId: "claim_2_cause" },
    ],
    underwritingRules: [
      {
        operator: "equals",
        value: "fire",
        decision: "refer",
        message: "A prior fire or smoke loss on the property requires underwriter review.",
      },
    ],
  },

  {
    id: "claim_2_cause",
    type: "choice",
    brokerText: "And what was the cause of the second claim?",
    options: [
      { label: "Water / Plumbing / Freeze", value: "water", emoji: "💧" },
      { label: "Fire / Smoke", value: "fire", emoji: "🔥" },
      { label: "Theft / Vandalism", value: "theft", emoji: "🦹" },
      { label: "Weather (wind, hail, storm)", value: "weather", emoji: "🌪️" },
      { label: "Liability / Injury", value: "liability", emoji: "⚖️" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "claims_repaired",
    conditionalBranches: [
      { when: { questionId: "prior_claims", operator: "equals", value: "3+" }, nextQuestionId: "claim_3_cause" },
    ],
    underwritingRules: [
      {
        operator: "equals",
        value: "fire",
        decision: "refer",
        message: "A prior fire or smoke loss on the property requires underwriter review.",
      },
    ],
  },

  {
    id: "claim_3_cause",
    type: "choice",
    brokerText: "What was the cause of the third (or most significant additional) claim?",
    options: [
      { label: "Water / Plumbing / Freeze", value: "water", emoji: "💧" },
      { label: "Fire / Smoke", value: "fire", emoji: "🔥" },
      { label: "Theft / Vandalism", value: "theft", emoji: "🦹" },
      { label: "Weather (wind, hail, storm)", value: "weather", emoji: "🌪️" },
      { label: "Liability / Injury", value: "liability", emoji: "⚖️" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "claims_repaired",
    underwritingRules: [
      {
        operator: "equals",
        value: "fire",
        decision: "refer",
        message: "A prior fire or smoke loss on the property requires underwriter review.",
      },
    ],
  },

  {
    id: "claims_repaired",
    type: "toggle",
    brokerText:
      "Have all the damages from these claim(s) been fully repaired and remediated?",
    helperText:
      "Unrepaired damage on a property that is now vacant is a significant exposure.",
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
          "Unrepaired damage from a prior claim requires underwriter review before a policy can be bound.",
      },
    ],
  },

  {
    id: "claims_largest_amount",
    type: "choice",
    brokerText: "Roughly how large was the biggest of these claims?",
    helperText: "An approximate amount is fine.",
    options: [
      { label: "Under $10,000", value: "under_10k", emoji: "💵" },
      { label: "$10,000 – $25,000", value: "10_25k", emoji: "💰" },
      { label: "$25,000 – $50,000", value: "25_50k", emoji: "💴" },
      { label: "Over $50,000", value: "over_50k", emoji: "⚠️" },
    ],
    defaultNextQuestionId: "prior_insurance",
    underwritingRules: [
      {
        operator: "equals",
        value: "over_50k",
        decision: "refer",
        message:
          "A prior claim exceeding $50,000 CAD requires underwriter review.",
      },
    ],
  },

  {
    id: "prior_insurance",
    type: "toggle",
    brokerText:
      "Is the property currently insured, or has it had an active insurance policy in the last 12 months?",
    options: [
      { label: "Yes — currently or recently insured", value: "yes" },
      { label: "No — no coverage / lapse in coverage", value: "no" },
    ],
    defaultNextQuestionId: "roof_age",
    underwritingRules: [
      {
        operator: "equals",
        value: "no",
        decision: "refer",
        message:
          "A lapse in coverage on a vacant property requires underwriter review.",
      },
    ],
    ratingFactor: "priorInsurance",
  },

  // ── SECTION 8B: BUILDING SYSTEMS & FIRE PROTECTION ───────
  {
    id: "roof_age",
    type: "choice",
    brokerText: "How old is the roof covering?",
    helperText:
      "Roof age is one of the strongest predictors of water and storm losses on vacant homes.",
    summaryLabel: "Roof Age",
    summarySection: "Building Systems",
    options: [
      { label: "0 – 10 years", value: "0-10", emoji: "✅", description: "Newer roof — discount" },
      { label: "11 – 20 years", value: "11-20", emoji: "🏠", description: "Standard rate" },
      { label: "21 – 30 years", value: "21-30", emoji: "🔧", description: "Aging — surcharge" },
      { label: "More than 30 years", value: "30+", emoji: "⚠️", description: "Requires review" },
    ],
    defaultNextQuestionId: "systems_updated",
    underwritingRules: [
      {
        operator: "equals",
        value: "30+",
        decision: "refer",
        message:
          "A roof older than 30 years on a vacant property requires underwriter review.",
      },
    ],
    ratingFactor: "roofAge",
  },

  {
    id: "systems_updated",
    type: "toggle",
    brokerText:
      "Have the electrical and plumbing systems been updated within the last 25 years?",
    helperText:
      "Knob-and-tube wiring, aluminum wiring, and galvanized/lead plumbing are common in older homes and raise fire and water exposure.",
    summaryLabel: "Electrical/Plumbing Updated",
    summarySection: "Building Systems",
    options: [
      { label: "Yes — updated within 25 years", value: "yes" },
      { label: "No — original or aged systems", value: "no" },
    ],
    defaultNextQuestionId: "heating_type",
    ratingFactor: "systemsUpdated",
  },

  {
    id: "heating_type",
    type: "choice",
    brokerText: "What is the primary heating source for the property?",
    helperText:
      "Wood and oil heating carry higher fire and environmental exposure, especially when a home is unoccupied.",
    summaryLabel: "Heating Type",
    summarySection: "Building Systems",
    options: [
      { label: "Natural Gas", value: "gas", emoji: "🔥" },
      { label: "Electric", value: "electric", emoji: "⚡" },
      { label: "Oil / Furnace Oil", value: "oil", emoji: "🛢️" },
      { label: "Wood / Solid Fuel", value: "wood", emoji: "🪵" },
      { label: "No active heating", value: "none", emoji: "❄️" },
    ],
    defaultNextQuestionId: "fire_protection",
    underwritingRules: [
      {
        operator: "equals",
        value: "wood",
        decision: "refer",
        message:
          "Wood or solid-fuel heating on a vacant property requires underwriter review due to elevated fire exposure.",
      },
    ],
    ratingFactor: "heatingType",
  },

  {
    id: "fire_protection",
    type: "choice",
    brokerText:
      "How well protected is the property in terms of fire services?",
    helperText:
      "Distance to the nearest fire hydrant and fire hall directly affects how quickly a fire can be contained.",
    summaryLabel: "Fire Protection",
    summarySection: "Building Systems",
    options: [
      { label: "Hydrant within 300m + nearby fire hall", value: "hydrant_close", emoji: "🚒", description: "Best rate" },
      { label: "Standard protected area", value: "protected", emoji: "✅", description: "Standard rate" },
      { label: "Limited / semi-protected", value: "semi_protected", emoji: "⚠️", description: "Surcharge" },
      { label: "No nearby hydrant or fire hall", value: "unprotected", emoji: "🚫", description: "Requires review" },
    ],
    defaultNextQuestionId: "renovation_in_progress",
    underwritingRules: [
      {
        operator: "equals",
        value: "unprotected",
        decision: "refer",
        message:
          "Properties with no nearby fire hydrant or fire hall require underwriter review.",
      },
    ],
    ratingFactor: "fireProtection",
  },

  {
    id: "renovation_in_progress",
    type: "choice",
    brokerText: "Is there any renovation or construction work currently in progress?",
    helperText:
      "Active renovations introduce tools, materials, and trades on site — and can change the fire and liability profile.",
    summaryLabel: "Renovation In Progress",
    summarySection: "Building Systems",
    options: [
      { label: "No renovations underway", value: "none", emoji: "✅" },
      { label: "Minor / cosmetic work", value: "minor", emoji: "🎨" },
      { label: "Major structural renovation", value: "major", emoji: "🏗️" },
    ],
    defaultNextQuestionId: "site_secured",
    underwritingRules: [
      {
        operator: "equals",
        value: "major",
        decision: "refer",
        message:
          "Major structural renovations in progress require underwriter review and may need a course-of-construction policy.",
      },
    ],
    ratingFactor: "renovation",
  },

  {
    id: "site_secured",
    type: "toggle",
    brokerText:
      "Is the property fenced or otherwise secured against unauthorized access?",
    helperText:
      "A secured site deters trespassers, vandalism, and liability claims on a vacant property.",
    summaryLabel: "Fenced / Secured Site",
    summarySection: "Building Systems",
    options: [
      { label: "Yes — fenced / secured", value: "yes" },
      { label: "No — open / unsecured", value: "no" },
    ],
    defaultNextQuestionId: "contact_phone",
    ratingFactor: "siteSecured",
  },

  // ── SECTION 9: CONTACT INFO ──────────────────────────────
  {
    id: "contact_phone",
    type: "text",
    inputType: "phone",
    brokerText:
      "Almost done, {{applicant_name}}! What's the best phone number to reach you?",
    helperText: "We'll only use this to discuss your quote if needed.",
    placeholder: "e.g. (416) 555-0142",
    defaultNextQuestionId: "contact_email",
    required: true,
  },

  {
    id: "contact_email",
    type: "text",
    inputType: "email",
    brokerText:
      "And last one — what email address should we send your quote to?",
    helperText: "We'll email you a copy of your full quote summary.",
    placeholder: "you@example.com",
    defaultNextQuestionId: "__SUBMIT__",
    required: true,
  },
];

// ── CONFIGURATION CONSTANTS ──────────────────────────────────
export const FIRST_QUESTION_ID = "applicant_name";
export const TOTAL_QUESTIONS = QUESTIONS.length;
