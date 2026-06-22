import { Question } from "@/types";

// ============================================================
// PERSONAL ITEMS (VALUABLE ARTICLES) — CONVERSATIONAL QUESTION FLOW
// ============================================================
// Mirrors the jeweller-block question schema. Answer ids are mapped
// to rating factors in personalItemsQuoteCalculator.ts and to
// decline/refer triggers via underwritingRules below.
//
// NOTE: `applicant_name`, `contact_phone`, and `contact_email`
// reuse the same ids as the other flows so the persistence layer
// maps them to the universal Submission columns without
// special-casing.
// ============================================================

export const ITEMS_QUESTIONS: Question[] = [
  // ── INTRODUCTION ─────────────────────────────────────────
  {
    id: "applicant_name",
    type: "text",
    inputType: "name",
    brokerText:
      "Hi there! 👋 I'm Alex, your virtual insurance broker. I'll put together a Personal Items (Valuable Articles) quote for you in just a few minutes. What's your name?",
    helperText: "Just your first name is perfectly fine.",
    placeholder: "e.g. Jordan",
    defaultNextQuestionId: "home_province",
    required: true,
    summaryLabel: "Contact Name",
    summarySection: "Applicant",
  },

  // ── LOCATION ─────────────────────────────────────────────
  {
    id: "home_province",
    type: "dropdown",
    brokerText:
      "Great to meet you, {{applicant_name}}! Which province or territory is your home in?",
    helperText: "We schedule valuable articles across Canada.",
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
    defaultNextQuestionId: "item_category",
    underwritingRules: [
      {
        operator: "in_list",
        value: ["NT", "NU", "YT"],
        decision: "refer",
        message:
          "Homes in the Northern Territories and Nunavut require individual underwriter review due to remoteness and limited security/response infrastructure.",
      },
    ],
    ratingFactor: "province",
    summaryLabel: "Province",
    summarySection: "Applicant",
  },

  // ── ITEMS & COVERAGE ─────────────────────────────────────
  {
    id: "item_category",
    type: "choice",
    brokerText:
      "What best describes the main type of items you'd like to schedule?",
    options: [
      { label: "Fine Jewellery / Watches", value: "jewellery_watches", emoji: "💍" },
      { label: "Fine Art", value: "fine_art", emoji: "🖼️" },
      { label: "Collectibles / Antiques", value: "collectibles", emoji: "🏺" },
      { label: "Cameras / Electronics", value: "cameras_electronics", emoji: "📷" },
      { label: "Musical Instruments", value: "musical_instruments", emoji: "🎻" },
      { label: "Sports Equipment", value: "sports_equipment", emoji: "🚴" },
      { label: "Other", value: "other", emoji: "📦" },
    ],
    defaultNextQuestionId: "total_insured_value",
    underwritingRules: [
      {
        operator: "equals",
        value: "fine_art",
        decision: "refer",
        message:
          "Fine art schedules require individual underwriter review and a specialist appraisal before terms can be offered.",
      },
    ],
    ratingFactor: "itemCategory",
    summaryLabel: "Item Category",
    summarySection: "Items & Coverage",
  },

  {
    id: "total_insured_value",
    type: "currency",
    brokerText:
      "What is the total value (in CAD) of all the items you'd like to insure? This becomes your sum insured.",
    helperText:
      "Add up the replacement/appraised value of every article you want scheduled.",
    placeholder: "50,000",
    min: 5000,
    max: 2000000,
    prefix: "$",
    defaultNextQuestionId: "single_item_max",
    underwritingRules: [
      {
        operator: "greater_than",
        value: 500000,
        decision: "refer",
        message:
          "A total scheduled value exceeding $500,000 CAD requires senior underwriter approval.",
      },
    ],
    ratingFactor: "totalInsuredValue",
    summaryLabel: "Total Insured Value",
    summarySection: "Items & Coverage",
  },

  {
    id: "single_item_max",
    type: "currency",
    brokerText:
      "What is the value of the single most expensive item on the schedule?",
    helperText:
      "The value of your highest-value article on its own — not the total.",
    placeholder: "15,000",
    min: 0,
    max: 2000000,
    prefix: "$",
    defaultNextQuestionId: "recent_appraisal",
    underwritingRules: [
      {
        operator: "greater_than",
        value: 100000,
        decision: "refer",
        message:
          "A single item valued over $100,000 CAD requires underwriter review and a current specialist appraisal.",
      },
    ],
    ratingFactor: "singleItemMax",
    summaryLabel: "Highest Single Item",
    summarySection: "Items & Coverage",
  },

  {
    id: "recent_appraisal",
    type: "toggle",
    brokerText:
      "Do you have a professional appraisal for the items dated within the last 3 years?",
    helperText:
      "A current professional appraisal substantiates values and speeds claims settlement.",
    options: [
      { label: "Yes — appraised within 3 years", value: "yes" },
      { label: "No — older or none", value: "no" },
    ],
    defaultNextQuestionId: "storage_security",
    underwritingRules: [
      {
        operator: "equals",
        value: "no",
        decision: "refer",
        message:
          "Items without a professional appraisal within the last 3 years require underwriter review to confirm values.",
      },
    ],
    ratingFactor: "recentAppraisal",
    summaryLabel: "Appraised (3 yrs)",
    summarySection: "Items & Coverage",
  },

  // ── SECURITY ─────────────────────────────────────────────
  {
    id: "storage_security",
    type: "choice",
    brokerText:
      "When the items are at home, how are they normally secured?",
    options: [
      { label: "Bank vault / safe deposit box", value: "bank_vault", emoji: "🏦", description: "Best rate" },
      { label: "Home safe + monitored alarm", value: "home_safe_alarm", emoji: "🔐", description: "Standard" },
      { label: "Monitored alarm only", value: "alarm_only", emoji: "🔔", description: "Surcharge" },
      { label: "No special security", value: "none", emoji: "🚫", description: "Outside appetite" },
    ],
    defaultNextQuestionId: "carried_outside_home",
    underwritingRules: [
      {
        operator: "equals",
        value: "none",
        decision: "refer",
        message:
          "Valuable articles kept with no special security (no safe or monitored alarm) require underwriter review.",
      },
    ],
    ratingFactor: "storageSecurity",
    summaryLabel: "Storage Security",
    summarySection: "Security",
  },

  {
    id: "carried_outside_home",
    type: "toggle",
    brokerText:
      "Are the items regularly carried or worn outside the home?",
    helperText:
      "Items taken out and about carry a higher loss exposure than those kept at home.",
    options: [
      { label: "Yes — carried/worn out regularly", value: "yes" },
      { label: "No — kept at home", value: "no" },
    ],
    defaultNextQuestionId: "prior_losses",
    ratingFactor: "carriedOutside",
    summaryLabel: "Carried Outside Home",
    summarySection: "Security",
  },

  // ── LOSS HISTORY ─────────────────────────────────────────
  {
    id: "prior_losses",
    type: "choice",
    brokerText:
      "How many loss, theft, or damage claims have you had in the last 5 years?",
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
          "Three or more loss/theft/damage claims within 5 years requires manual underwriter review.",
      },
    ],
    ratingFactor: "priorLosses",
    summaryLabel: "Losses (5 yrs)",
    summarySection: "Loss History",
  },

  // ── LOSS DETAILS — asked only when 1+ prior losses ──────
  // The number of "cause" questions scales with the loss count
  // (1 → loss_1, 2 → loss_1/2, 3+ → loss_1/2/3), then two shared
  // follow-ups about recovery and severity.
  {
    id: "loss_1_cause",
    type: "choice",
    brokerText: "What was the nature of the most recent loss?",
    options: [
      { label: "Theft", value: "theft", emoji: "🦹" },
      { label: "Accidental loss / misplacement", value: "accidental", emoji: "🤷" },
      { label: "Damage / breakage", value: "damage", emoji: "💥" },
      { label: "Mysterious disappearance", value: "disappearance", emoji: "❓" },
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
      { label: "Theft", value: "theft", emoji: "🦹" },
      { label: "Accidental loss / misplacement", value: "accidental", emoji: "🤷" },
      { label: "Damage / breakage", value: "damage", emoji: "💥" },
      { label: "Mysterious disappearance", value: "disappearance", emoji: "❓" },
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
      { label: "Theft", value: "theft", emoji: "🦹" },
      { label: "Accidental loss / misplacement", value: "accidental", emoji: "🤷" },
      { label: "Damage / breakage", value: "damage", emoji: "💥" },
      { label: "Mysterious disappearance", value: "disappearance", emoji: "❓" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "losses_addressed",
    summaryLabel: "Loss 3 — Type",
    summarySection: "Loss History",
  },

  {
    id: "losses_addressed",
    type: "toggle",
    brokerText: "Have the item(s) been recovered or replaced?",
    options: [
      { label: "Yes — recovered or replaced", value: "yes" },
      { label: "No", value: "no" },
    ],
    defaultNextQuestionId: "losses_largest_amount",
    summaryLabel: "Recovered / Replaced",
    summarySection: "Loss History",
  },

  {
    id: "losses_largest_amount",
    type: "choice",
    brokerText: "Roughly how large was the biggest loss?",
    helperText: "An approximate amount is fine.",
    options: [
      { label: "Under $10,000", value: "under_10k", emoji: "💵" },
      { label: "$10,000 – $50,000", value: "k10_50", emoji: "💰" },
      { label: "$50,000 – $100,000", value: "k50_100", emoji: "💴" },
      { label: "Over $100,000", value: "over_100k", emoji: "⚠️" },
    ],
    defaultNextQuestionId: "deductible",
    underwritingRules: [
      {
        operator: "equals",
        value: "over_100k",
        decision: "refer",
        message:
          "A prior loss exceeding $100,000 CAD requires underwriter review.",
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
      { label: "$0 CAD", value: 0, description: "Higher premium" },
      { label: "$500 CAD", value: 500, description: "Balanced — most popular" },
      { label: "$1,000 CAD", value: 1000, description: "Lower premium" },
      { label: "$2,500 CAD", value: 2500, description: "Lowest premium" },
    ],
    defaultNextQuestionId: "number_of_items",
    ratingFactor: "deductible",
    summaryLabel: "Deductible",
    summarySection: "Items & Coverage",
  },

  // ── SCHEDULE DETAIL & RISK ───────────────────────────────
  {
    id: "number_of_items",
    type: "choice",
    brokerText:
      "How many individual items will be listed on the schedule?",
    helperText:
      "Each scheduled item is listed separately with its own value.",
    options: [
      { label: "1 – 3 items", value: "1_3", emoji: "🔢" },
      { label: "4 – 10 items", value: "4_10", emoji: "🔟" },
      { label: "11 – 25 items", value: "11_25", emoji: "📚" },
      { label: "26 or more", value: "26+", emoji: "📈" },
    ],
    defaultNextQuestionId: "worn_frequency",
    ratingFactor: "numberOfItems",
    summaryLabel: "Number of Items",
    summarySection: "Items & Coverage",
  },

  {
    id: "worn_frequency",
    type: "choice",
    brokerText:
      "How often are the items typically worn or used?",
    helperText:
      "More frequent wear or use increases the chance of loss or damage.",
    options: [
      { label: "Kept in a vault — rarely handled", value: "vault_kept", emoji: "🏦", description: "Lowest exposure" },
      { label: "Special occasions only", value: "occasional", emoji: "🎉" },
      { label: "Weekly", value: "weekly", emoji: "📅" },
      { label: "Every day", value: "daily", emoji: "🔁", description: "Highest exposure" },
    ],
    defaultNextQuestionId: "alarm_monitored",
    ratingFactor: "wornFrequency",
    summaryLabel: "Worn / Used",
    summarySection: "Security",
  },

  {
    id: "alarm_monitored",
    type: "choice",
    brokerText:
      "Is the home protected by a monitored burglar alarm?",
    options: [
      { label: "Yes — central station monitored", value: "central_station", emoji: "📡", description: "Best rate" },
      { label: "Self / app monitored only", value: "self_monitored", emoji: "📱" },
      { label: "No alarm", value: "none", emoji: "🚫", description: "Surcharge" },
    ],
    defaultNextQuestionId: "travel_international",
    ratingFactor: "alarmMonitored",
    summaryLabel: "Monitored Alarm",
    summarySection: "Security",
  },

  {
    id: "travel_international",
    type: "choice",
    brokerText:
      "How often are any of the items taken on international trips?",
    helperText:
      "Items taken abroad face different theft and loss exposures.",
    options: [
      { label: "Never — they stay in Canada", value: "never", emoji: "🏠" },
      { label: "Occasionally", value: "occasionally", emoji: "✈️" },
      { label: "Frequently", value: "frequently", emoji: "🌍", description: "Underwriter review" },
    ],
    defaultNextQuestionId: "prior_theft_valuables",
    underwritingRules: [
      {
        operator: "equals",
        value: "frequently",
        decision: "refer",
        message:
          "Valuables taken internationally on a frequent basis require underwriter review of worldwide territory coverage.",
      },
    ],
    ratingFactor: "travelInternational",
    summaryLabel: "International Travel",
    summarySection: "Security",
  },

  {
    id: "prior_theft_valuables",
    type: "toggle",
    brokerText:
      "Aside from any claims mentioned, have you ever had valuables stolen (whether insured or not)?",
    helperText:
      "Prior theft is an important factor in assessing the risk.",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
    defaultNextQuestionId: "documentation_on_file",
    underwritingRules: [
      {
        operator: "equals",
        value: "yes",
        decision: "refer",
        message:
          "A prior theft of valuables requires underwriter review before terms can be confirmed.",
      },
    ],
    ratingFactor: "priorTheft",
    summaryLabel: "Prior Theft",
    summarySection: "Loss History",
  },

  {
    id: "documentation_on_file",
    type: "toggle",
    brokerText:
      "Do you have photos, serial numbers, or engravings on file for the items?",
    helperText:
      "Documentation helps prove ownership and aids recovery after a loss.",
    options: [
      { label: "Yes — documented", value: "yes" },
      { label: "No", value: "no" },
    ],
    defaultNextQuestionId: "contact_phone",
    ratingFactor: "documentation",
    summaryLabel: "Photos / Engraving on File",
    summarySection: "Security",
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

export const ITEMS_FIRST_QUESTION_ID = "applicant_name";
