import { Question } from "@/types";

// ============================================================
// FARM INSURANCE — CONVERSATIONAL QUESTION FLOW
// ============================================================
// Structured to mirror the Mutual Fire Farm Application modules:
//   General Information · Locations · Habitational · Farm Buildings ·
//   Machinery & Equipment · Livestock · Earnings & Profits ·
//   Tank Data · Liability · Loss History · Property & Coverage ·
//   Broker Information · Contact
//
// Rated answer ids map to factors in farmQuoteCalculator.ts; the rest
// are captured for the underwriter (stored in the allAnswers JSON and
// shown in the summary/PDF). decline/refer triggers live in the
// underwritingRules below.
//
// NOTE: `applicant_name` and `contact_email` reuse the same ids as the
// other flows so persistence maps them to the universal Submission
// columns. Rated ids (farm_province, farm_type, years_farming,
// gross_revenue, dwelling_*, roof_age, electrical_wiring, plumbing_type,
// primary_heating, wood_heat, smoke_detectors, monitored_security,
// swimming_pool, num_buildings, liability_limit, prior_losses,
// deductible, sum_insured) are read by the calculator — keep them stable.
// ============================================================

export const FARM_QUESTIONS: Question[] = [
  // ════════════════════════════════════════════════════════
  // MODULE 1 — GENERAL INFORMATION
  // ════════════════════════════════════════════════════════
  {
    id: "applicant_name",
    type: "text",
    inputType: "name",
    brokerText:
      "Hi there! 👋 I'm Alex, your virtual insurance broker. I'll work through a full Farm Insurance application with you, section by section. First — what's your name?",
    helperText: "Just your first name is perfectly fine.",
    placeholder: "e.g. Dale",
    defaultNextQuestionId: "named_insured_legal",
    required: true,
    summaryLabel: "Contact Name",
    summarySection: "General Information",
  },
  {
    id: "named_insured_legal",
    type: "text",
    brokerText: "What is the full legal name(s) of the named insured(s)?",
    helperText: "As it should appear on the policy.",
    placeholder: "e.g. Dale & Pat Morrison",
    defaultNextQuestionId: "mailing_address",
    required: true,
    summaryLabel: "Named Insured(s)",
    summarySection: "General Information",
  },
  {
    id: "mailing_address",
    type: "text",
    brokerText: "What's the mailing address for the named insured?",
    placeholder: "e.g. 123 Range Road 42, Olds, AB",
    defaultNextQuestionId: "farm_province",
    required: true,
    summaryLabel: "Mailing Address",
    summarySection: "General Information",
  },
  {
    id: "farm_province",
    type: "dropdown",
    brokerText: "Which province or territory is the farm located in?",
    helperText: "We write Farm Insurance across Canada.",
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
    defaultNextQuestionId: "has_website",
    underwritingRules: [
      {
        operator: "in_list",
        value: ["NT", "NU", "YT"],
        decision: "refer",
        message:
          "Farms in the Northern Territories and Nunavut require individual underwriter review due to remoteness and limited fire-response infrastructure.",
      },
    ],
    ratingFactor: "province",
    summaryLabel: "Province",
    summarySection: "General Information",
  },
  {
    id: "has_website",
    type: "toggle",
    brokerText: "Does the farm business have a website?",
    options: [
      { label: "No", value: "no" },
      { label: "Yes", value: "yes" },
    ],
    defaultNextQuestionId: "current_insurer",
    conditionalBranches: [
      { when: { operator: "equals", value: "yes" }, nextQuestionId: "website_url" },
    ],
    summaryLabel: "Has Website",
    summarySection: "General Information",
  },
  {
    id: "website_url",
    type: "text",
    brokerText: "What's the website URL?",
    placeholder: "e.g. www.morrisonfarms.ca",
    defaultNextQuestionId: "current_insurer",
    summaryLabel: "Website",
    summarySection: "General Information",
  },
  {
    id: "current_insurer",
    type: "text",
    brokerText: "Who is the current insurer? (Type 'None' if not currently insured.)",
    placeholder: "e.g. Co-operators",
    defaultNextQuestionId: "years_continuously_insured",
    required: true,
    summaryLabel: "Current Insurer",
    summarySection: "General Information",
  },
  {
    id: "years_continuously_insured",
    type: "number",
    brokerText: "For how many years have you been continuously insured?",
    helperText: "An approximate number is fine — enter 0 if not currently insured.",
    placeholder: "e.g. 6",
    min: 0,
    max: 100,
    suffix: "yrs",
    noGrouping: true,
    defaultNextQuestionId: "farm_type",
    summaryLabel: "Continuously Insured",
    summarySection: "General Information",
  },
  {
    id: "farm_type",
    type: "choice",
    brokerText: "What best describes the farm operation?",
    options: [
      { label: "Crop / Grain", value: "crop", emoji: "🌾" },
      { label: "Livestock", value: "livestock", emoji: "🐄" },
      { label: "Dairy", value: "dairy", emoji: "🥛" },
      { label: "Mixed (crop + livestock)", value: "mixed", emoji: "🚜" },
      { label: "Hobby / Lifestyle farm", value: "hobby", emoji: "🌱" },
    ],
    defaultNextQuestionId: "years_farming",
    ratingFactor: "farmType",
    summaryLabel: "Operation Type",
    summarySection: "General Information",
  },
  {
    id: "years_farming",
    type: "number",
    brokerText: "How many years has the farm been in operation?",
    helperText: "An approximate number is fine.",
    placeholder: "e.g. 12",
    min: 0,
    max: 150,
    suffix: "yrs",
    noGrouping: true,
    defaultNextQuestionId: "refused_insurance",
    underwritingRules: [
      {
        operator: "less_than",
        value: 1,
        decision: "refer",
        message:
          "A newly established farm (under 1 year operating) requires underwriter review of management experience.",
      },
    ],
    ratingFactor: "yearsFarming",
    summaryLabel: "Years Operating",
    summarySection: "General Information",
  },
  {
    id: "refused_insurance",
    type: "toggle",
    brokerText:
      "Have you ever been refused, cancelled, or declined insurance in the past 5 years?",
    options: [
      { label: "No", value: "no" },
      { label: "Yes", value: "yes" },
    ],
    defaultNextQuestionId: "property_address",
    underwritingRules: [
      {
        operator: "equals",
        value: "yes",
        decision: "refer",
        message:
          "A prior refusal, cancellation, or declinature within 5 years requires underwriter review.",
      },
    ],
    summaryLabel: "Prior Refusal/Cancellation",
    summarySection: "General Information",
  },

  // ════════════════════════════════════════════════════════
  // MODULE 2 — PRINCIPAL & ADDITIONAL LOCATIONS
  // ════════════════════════════════════════════════════════
  {
    // `type: "address"` shows a live map preview on the form (Google Places
    // autocomplete) and persists to the `propertyAddress` column, so the
    // policy detail page and PDF render the location map automatically — same
    // pipeline as Vacant Home / Rental Home. Province rating still uses the
    // explicit `farm_province` dropdown above (robust without a Maps key).
    id: "property_address",
    type: "address",
    brokerText:
      "What's the full address of the principal farm location? Start typing and pick it from the suggestions — we'll show it on the map.",
    helperText: "This is the main risk location shown on the policy and PDF.",
    placeholder: "e.g. 123 Range Road 42, Olds, AB",
    defaultNextQuestionId: "num_locations",
    required: true,
    summaryLabel: "Principal Location Address",
    summarySection: "Locations",
  },
  {
    id: "num_locations",
    type: "number",
    brokerText: "How many locations does the farm operate across (principal + additional)?",
    helperText: "Count every parcel you want considered.",
    placeholder: "e.g. 2",
    min: 1,
    max: 50,
    suffix: "locations",
    noGrouping: true,
    defaultNextQuestionId: "primary_location_acres",
    summaryLabel: "Number of Locations",
    summarySection: "Locations",
  },
  {
    id: "primary_location_acres",
    type: "number",
    brokerText: "How many acres is the principal location?",
    placeholder: "e.g. 640",
    min: 0,
    max: 1000000,
    suffix: "acres",
    defaultNextQuestionId: "location_tenure",
    summaryLabel: "Principal Acres",
    summarySection: "Locations",
  },
  {
    id: "location_tenure",
    type: "choice",
    brokerText: "Is the farmland owned, rented, or a mix?",
    options: [
      { label: "Owned", value: "owned", emoji: "🏡" },
      { label: "Rented", value: "rented", emoji: "📄" },
      { label: "Mix of owned & rented", value: "mixed", emoji: "🤝" },
    ],
    defaultNextQuestionId: "num_dwellings",
    conditionalBranches: [
      {
        when: { questionId: "num_locations", operator: "greater_than", value: 1 },
        nextQuestionId: "additional_locations_desc",
      },
    ],
    summaryLabel: "Land Tenure",
    summarySection: "Locations",
  },
  {
    id: "additional_locations_desc",
    type: "text",
    brokerText: "Briefly describe the additional location(s) — address, acres, and use.",
    placeholder: "e.g. NW-12-34-5 W4, 160 ac, pasture",
    defaultNextQuestionId: "num_dwellings",
    summaryLabel: "Additional Locations",
    summarySection: "Locations",
  },

  // ════════════════════════════════════════════════════════
  // MODULE 3 — HABITATIONAL (MAIN DWELLING)
  // ════════════════════════════════════════════════════════
  {
    id: "num_dwellings",
    type: "number",
    brokerText: "How many dwellings (homes) are on the farm?",
    placeholder: "e.g. 1",
    min: 0,
    max: 20,
    suffix: "dwellings",
    noGrouping: true,
    defaultNextQuestionId: "dwelling_occupancy",
    summaryLabel: "Number of Dwellings",
    summarySection: "Habitational",
  },
  {
    id: "dwelling_occupancy",
    type: "choice",
    brokerText: "How is the main dwelling occupied?",
    options: [
      { label: "Owner-occupied", value: "owner", emoji: "🏠" },
      { label: "Tenant-occupied", value: "tenant", emoji: "🔑" },
      { label: "Seasonal", value: "seasonal", emoji: "🌤️" },
      { label: "Vacant", value: "vacant", emoji: "⚠️", description: "Requires review" },
    ],
    defaultNextQuestionId: "dwelling_year_built",
    underwritingRules: [
      {
        operator: "equals",
        value: "vacant",
        decision: "refer",
        message:
          "A vacant dwelling on the farm requires underwriter review (vacancy is a distinct fire/water exposure).",
      },
    ],
    summaryLabel: "Dwelling Occupancy",
    summarySection: "Habitational",
  },
  {
    id: "dwelling_year_built",
    type: "number",
    brokerText: "What year was the main dwelling built?",
    helperText: "An approximate year is fine.",
    placeholder: "e.g. 1985",
    min: 1850,
    max: 2026,
    noGrouping: true,
    defaultNextQuestionId: "dwelling_sqft",
    underwritingRules: [
      {
        operator: "less_than",
        value: 1920,
        decision: "refer",
        message:
          "A dwelling built before 1920 requires underwriter review of updates to the roof, wiring, plumbing, and heating.",
      },
    ],
    ratingFactor: "dwellingAge",
    summaryLabel: "Dwelling Year Built",
    summarySection: "Habitational",
  },
  {
    id: "dwelling_sqft",
    type: "number",
    brokerText: "What is the dwelling's living area?",
    placeholder: "e.g. 1800",
    min: 200,
    max: 50000,
    suffix: "sq ft",
    defaultNextQuestionId: "dwelling_construction",
    summaryLabel: "Living Area",
    summarySection: "Habitational",
  },
  {
    id: "dwelling_construction",
    type: "choice",
    brokerText: "What is the dwelling's exterior wall construction?",
    options: [
      { label: "Masonry (brick / stone)", value: "masonry", emoji: "🧱", description: "Best rate" },
      { label: "Wood frame", value: "frame", emoji: "🪵" },
      { label: "Log", value: "log", emoji: "🌲" },
      { label: "Other", value: "other", emoji: "🏚️" },
    ],
    defaultNextQuestionId: "roof_type",
    ratingFactor: "construction",
    summaryLabel: "Construction",
    summarySection: "Habitational",
  },
  {
    id: "roof_type",
    type: "choice",
    brokerText: "What is the roof covering?",
    options: [
      { label: "Asphalt shingle", value: "asphalt", emoji: "🏠" },
      { label: "Metal", value: "metal", emoji: "🔩" },
      { label: "Other", value: "other", emoji: "🪵" },
    ],
    defaultNextQuestionId: "roof_age",
    summaryLabel: "Roof Type",
    summarySection: "Habitational",
  },
  {
    id: "roof_age",
    type: "choice",
    brokerText: "How old is the dwelling's roof?",
    options: [
      { label: "Under 10 years", value: "new", emoji: "✅", description: "Best rate" },
      { label: "10–20 years", value: "mid", emoji: "🏠" },
      { label: "20–25 years", value: "aging", emoji: "⚠️" },
      { label: "Over 25 years", value: "old", emoji: "❗", description: "Requires review" },
    ],
    defaultNextQuestionId: "electrical_wiring",
    underwritingRules: [
      {
        operator: "equals",
        value: "old",
        decision: "refer",
        message:
          "A roof over 25 years old requires underwriter review or a roof-update condition.",
      },
    ],
    ratingFactor: "roofAge",
    summaryLabel: "Roof Age",
    summarySection: "Habitational",
  },
  {
    id: "electrical_wiring",
    type: "choice",
    brokerText: "What is the dwelling's electrical wiring type?",
    options: [
      { label: "Copper", value: "copper", emoji: "✅", description: "Best rate" },
      { label: "Aluminum", value: "aluminum", emoji: "⚡" },
      { label: "Mixed", value: "mixed", emoji: "🔌" },
      { label: "Knob and tube", value: "knob_and_tube", emoji: "⚠️", description: "Requires review" },
    ],
    defaultNextQuestionId: "electrical_amps",
    underwritingRules: [
      {
        operator: "equals",
        value: "knob_and_tube",
        decision: "refer",
        message:
          "Knob-and-tube wiring is a fire exposure and requires underwriter review or a replacement condition.",
      },
    ],
    ratingFactor: "wiring",
    summaryLabel: "Electrical Wiring",
    summarySection: "Habitational",
  },
  {
    id: "electrical_amps",
    type: "choice",
    brokerText: "What is the electrical service amperage?",
    options: [
      { label: "60 amp", value: "60", emoji: "⚠️" },
      { label: "100 amp", value: "100", emoji: "🔌" },
      { label: "200 amp", value: "200", emoji: "✅" },
      { label: "Other / not sure", value: "other", emoji: "❔" },
    ],
    defaultNextQuestionId: "plumbing_type",
    summaryLabel: "Electrical Amps",
    summarySection: "Habitational",
  },
  {
    id: "plumbing_type",
    type: "choice",
    brokerText: "What is the dwelling's plumbing type?",
    options: [
      { label: "Copper / plastic", value: "copper_plastic", emoji: "✅", description: "Best rate" },
      { label: "Galvanized", value: "galvanized", emoji: "🔧" },
      { label: "Poly-B", value: "poly_b", emoji: "⚠️", description: "Requires review" },
      { label: "Other", value: "other", emoji: "🚰" },
    ],
    defaultNextQuestionId: "primary_heating",
    underwritingRules: [
      {
        operator: "equals",
        value: "poly_b",
        decision: "refer",
        message:
          "Poly-B plumbing has a known failure history and requires underwriter review.",
      },
    ],
    ratingFactor: "plumbing",
    summaryLabel: "Plumbing",
    summarySection: "Habitational",
  },
  {
    id: "primary_heating",
    type: "choice",
    brokerText: "What is the dwelling's primary heating source?",
    options: [
      { label: "Electric", value: "electric", emoji: "⚡" },
      { label: "Natural gas", value: "natural_gas", emoji: "🔥", description: "Best rate" },
      { label: "Propane", value: "propane", emoji: "🛢️" },
      { label: "Oil", value: "oil", emoji: "🛢️" },
      { label: "Wood / solid fuel", value: "wood", emoji: "🪵" },
    ],
    defaultNextQuestionId: "wood_heat",
    conditionalBranches: [
      { when: { operator: "equals", value: "oil" }, nextQuestionId: "oil_tank" },
    ],
    ratingFactor: "primaryHeating",
    summaryLabel: "Primary Heating",
    summarySection: "Habitational",
  },
  {
    id: "oil_tank",
    type: "choice",
    brokerText: "Tell me about the oil tank.",
    helperText: "Tank age and containment drive the spill/pollution exposure.",
    options: [
      { label: "Double-walled, under 15 yrs", value: "double_ok", emoji: "✅", description: "Best" },
      { label: "Single-walled", value: "single_walled", emoji: "⚠️", description: "Requires review" },
      { label: "Over 15 years old", value: "over_15", emoji: "❗", description: "Requires review" },
    ],
    defaultNextQuestionId: "wood_heat",
    underwritingRules: [
      {
        operator: "in_list",
        value: ["single_walled", "over_15"],
        decision: "refer",
        message:
          "A single-walled or aged (15+ yr) oil tank is a spill exposure and requires underwriter review.",
      },
    ],
    summaryLabel: "Oil Tank",
    summarySection: "Habitational",
  },
  {
    id: "wood_heat",
    type: "choice",
    brokerText:
      "Is there any wood or solid-fuel heating (woodstove, furnace, or auxiliary heat)?",
    helperText:
      "Solid-fuel heat is a major fire exposure; certified (CSA/ULC/WH) installations attract better terms.",
    options: [
      { label: "No wood / solid-fuel heat", value: "none", emoji: "✅", description: "Best rate" },
      { label: "Certified woodstove / furnace", value: "certified", emoji: "🪵", description: "CSA/ULC/WH" },
      { label: "Uncertified wood heat", value: "uncertified", emoji: "⚠️", description: "Requires review" },
    ],
    defaultNextQuestionId: "smoke_detectors",
    conditionalBranches: [
      { when: { operator: "not_equals", value: "none" }, nextQuestionId: "wood_cords" },
    ],
    underwritingRules: [
      {
        operator: "equals",
        value: "uncertified",
        decision: "refer",
        message:
          "Uncertified solid-fuel (wood) heating requires underwriter review of the installation and clearances.",
      },
    ],
    ratingFactor: "woodHeat",
    summaryLabel: "Wood / Solid-Fuel Heat",
    summarySection: "Habitational",
  },
  {
    id: "wood_cords",
    type: "number",
    brokerText: "Roughly how many bush cords of wood are burned per year?",
    placeholder: "e.g. 4",
    min: 0,
    max: 200,
    suffix: "cords",
    noGrouping: true,
    defaultNextQuestionId: "smoke_detectors",
    summaryLabel: "Bush Cords / Year",
    summarySection: "Habitational",
  },
  {
    id: "smoke_detectors",
    type: "toggle",
    brokerText: "Are there working smoke detectors in the dwelling?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
    defaultNextQuestionId: "monitored_security",
    underwritingRules: [
      {
        operator: "equals",
        value: "no",
        decision: "refer",
        message:
          "Absence of working smoke detectors requires underwriter review and is typically a condition of binding.",
      },
    ],
    ratingFactor: "smokeDetectors",
    summaryLabel: "Smoke Detectors",
    summarySection: "Habitational",
  },
  {
    id: "monitored_security",
    type: "toggle",
    brokerText: "Is there a monitored security or alarm system on the premises?",
    options: [
      { label: "Yes — monitored", value: "yes" },
      { label: "No", value: "no" },
    ],
    defaultNextQuestionId: "swimming_pool",
    ratingFactor: "monitoredSecurity",
    summaryLabel: "Monitored Security",
    summarySection: "Habitational",
  },
  {
    id: "swimming_pool",
    type: "choice",
    brokerText: "Is there a swimming pool on the property?",
    options: [
      { label: "No pool", value: "none", emoji: "🚫" },
      { label: "Yes — fenced", value: "fenced", emoji: "✅" },
      { label: "Yes — not fenced", value: "unfenced", emoji: "⚠️", description: "Requires review" },
    ],
    defaultNextQuestionId: "dwelling_coverage_form",
    underwritingRules: [
      {
        operator: "equals",
        value: "unfenced",
        decision: "refer",
        message:
          "An unfenced swimming pool is an attractive-nuisance liability exposure and requires underwriter review.",
      },
    ],
    ratingFactor: "swimmingPool",
    summaryLabel: "Swimming Pool",
    summarySection: "Habitational",
  },
  {
    id: "dwelling_coverage_form",
    type: "choice",
    brokerText: "What coverage form would you like on the dwelling?",
    options: [
      { label: "Comprehensive", value: "comprehensive", emoji: "🛡️", description: "Broadest" },
      { label: "Named perils", value: "named_perils", emoji: "📋" },
      { label: "Basic / fire only", value: "basic", emoji: "🔥" },
    ],
    defaultNextQuestionId: "guaranteed_replacement_cost",
    summaryLabel: "Coverage Form",
    summarySection: "Habitational",
  },
  {
    id: "guaranteed_replacement_cost",
    type: "toggle",
    brokerText: "Would you like Guaranteed Replacement Cost on the dwelling?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
    defaultNextQuestionId: "num_buildings",
    summaryLabel: "Guaranteed Replacement Cost",
    summarySection: "Habitational",
  },

  // ════════════════════════════════════════════════════════
  // MODULE 4 — FARM BUILDINGS
  // ════════════════════════════════════════════════════════
  {
    id: "num_buildings",
    type: "number",
    brokerText: "How many farm buildings and outbuildings are on the property (excluding the dwelling)?",
    helperText: "Barns, machine sheds, shops, grain bins, etc.",
    placeholder: "e.g. 4",
    min: 0,
    max: 100,
    suffix: "buildings",
    noGrouping: true,
    defaultNextQuestionId: "buildings_total_value",
    ratingFactor: "numBuildings",
    summaryLabel: "Number of Farm Buildings",
    summarySection: "Farm Buildings",
  },
  {
    id: "buildings_total_value",
    type: "currency",
    brokerText: "What is the total replacement value of those farm buildings?",
    placeholder: "600,000",
    min: 0,
    max: 50000000,
    prefix: "$",
    defaultNextQuestionId: "building_primary_use",
    summaryLabel: "Farm Buildings Value",
    summarySection: "Farm Buildings",
  },
  {
    id: "building_primary_use",
    type: "choice",
    brokerText: "What is the primary use of the largest farm building?",
    options: [
      { label: "Livestock barn", value: "barn", emoji: "🐄" },
      { label: "Machine shed", value: "machine_shed", emoji: "🚜" },
      { label: "Grain storage / bins", value: "grain", emoji: "🌾" },
      { label: "Workshop", value: "shop", emoji: "🔧" },
      { label: "General storage", value: "storage", emoji: "📦" },
      { label: "Other", value: "other", emoji: "🏚️" },
    ],
    defaultNextQuestionId: "machinery_total_value",
    summaryLabel: "Largest Building Use",
    summarySection: "Farm Buildings",
  },

  // ════════════════════════════════════════════════════════
  // MODULE 5 — FARM MACHINERY, EQUIPMENT, TACK & TOOLS
  // ════════════════════════════════════════════════════════
  {
    id: "machinery_total_value",
    type: "currency",
    brokerText: "What is the total value of farm machinery, equipment, tack, and tools to insure?",
    placeholder: "400,000",
    min: 0,
    max: 50000000,
    prefix: "$",
    defaultNextQuestionId: "machinery_valuation",
    summaryLabel: "Machinery & Equipment Value",
    summarySection: "Machinery & Equipment",
  },
  {
    id: "machinery_valuation",
    type: "choice",
    brokerText: "How should the machinery be valued at claim time?",
    options: [
      { label: "Replacement Cost (RC)", value: "rc", emoji: "🔄" },
      { label: "Actual Cash Value (ACV)", value: "acv", emoji: "💵" },
    ],
    defaultNextQuestionId: "high_value_equipment",
    summaryLabel: "Machinery Valuation",
    summarySection: "Machinery & Equipment",
  },
  {
    id: "high_value_equipment",
    type: "toggle",
    brokerText: "Is any single piece of equipment worth more than $250,000?",
    helperText: "High-value units (combines, sprayers) may need to be scheduled.",
    options: [
      { label: "No", value: "no" },
      { label: "Yes", value: "yes" },
    ],
    defaultNextQuestionId: "custom_farming",
    summaryLabel: "High-Value Equipment",
    summarySection: "Machinery & Equipment",
  },
  {
    id: "custom_farming",
    type: "toggle",
    brokerText: "Do you do custom farming work (seeding, harvesting, spraying, snow removal) for others?",
    options: [
      { label: "No", value: "no" },
      { label: "Yes", value: "yes" },
    ],
    defaultNextQuestionId: "has_livestock",
    underwritingRules: [
      {
        operator: "equals",
        value: "yes",
        decision: "refer",
        message:
          "Custom farming for others is a commercial liability exposure that requires underwriter review of receipts and operations.",
      },
    ],
    summaryLabel: "Custom Farming for Others",
    summarySection: "Machinery & Equipment",
  },

  // ════════════════════════════════════════════════════════
  // MODULE 6 — FARM LIVESTOCK
  // ════════════════════════════════════════════════════════
  {
    id: "has_livestock",
    type: "toggle",
    brokerText: "Do you keep any livestock on the farm?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
    defaultNextQuestionId: "livestock_types",
    conditionalBranches: [
      { when: { operator: "equals", value: "no" }, nextQuestionId: "gross_revenue" },
    ],
    summaryLabel: "Keeps Livestock",
    summarySection: "Livestock",
  },
  {
    id: "livestock_types",
    type: "choice",
    brokerText: "What kind of livestock do you keep?",
    options: [
      { label: "Cattle / beef", value: "cattle", emoji: "🐄" },
      { label: "Dairy cattle", value: "dairy", emoji: "🥛" },
      { label: "Hogs", value: "hogs", emoji: "🐖" },
      { label: "Poultry", value: "poultry", emoji: "🐓" },
      { label: "Horses / equine", value: "equine", emoji: "🐴" },
      { label: "Sheep / goats / mixed", value: "mixed", emoji: "🐑" },
    ],
    defaultNextQuestionId: "livestock_count",
    summaryLabel: "Livestock Type",
    summarySection: "Livestock",
  },
  {
    id: "livestock_count",
    type: "number",
    brokerText: "Roughly how many head of livestock are kept at peak?",
    placeholder: "e.g. 120",
    min: 0,
    max: 1000000,
    suffix: "head",
    defaultNextQuestionId: "livestock_value",
    summaryLabel: "Livestock Count",
    summarySection: "Livestock",
  },
  {
    id: "livestock_value",
    type: "currency",
    brokerText: "What is the total value of the livestock to insure?",
    placeholder: "250,000",
    min: 0,
    max: 50000000,
    prefix: "$",
    defaultNextQuestionId: "boards_livestock",
    summaryLabel: "Livestock Value",
    summarySection: "Livestock",
  },
  {
    id: "boards_livestock",
    type: "toggle",
    brokerText: "Do you board or care for livestock owned by other people?",
    helperText: "Caring for others' animals creates a bailee liability exposure.",
    options: [
      { label: "No", value: "no" },
      { label: "Yes", value: "yes" },
    ],
    defaultNextQuestionId: "livestock_loss_prevention",
    underwritingRules: [
      {
        operator: "equals",
        value: "yes",
        decision: "refer",
        message:
          "Boarding livestock owned by others creates a bailee exposure that requires underwriter review.",
      },
    ],
    summaryLabel: "Boards Others' Livestock",
    summarySection: "Livestock",
  },
  {
    id: "livestock_loss_prevention",
    type: "text",
    brokerText: "What loss-prevention measures protect the livestock? (e.g. backup power, alarms, ventilation)",
    placeholder: "e.g. Standby generator, barn heat/smoke alarms",
    defaultNextQuestionId: "gross_revenue",
    summaryLabel: "Livestock Loss Prevention",
    summarySection: "Livestock",
  },

  // ════════════════════════════════════════════════════════
  // MODULE 7 — EARNINGS AND PROFITS
  // ════════════════════════════════════════════════════════
  {
    id: "gross_revenue",
    type: "currency",
    brokerText: "What are the farm's approximate gross annual receipts (in CAD)?",
    helperText: "Total revenue from all farm operations in a typical year.",
    placeholder: "350,000",
    min: 0,
    max: 100000000,
    prefix: "$",
    defaultNextQuestionId: "us_intl_sales",
    ratingFactor: "revenue",
    summaryLabel: "Gross Annual Receipts",
    summarySection: "Earnings & Profits",
  },
  {
    id: "us_intl_sales",
    type: "toggle",
    brokerText: "Does the farm have any US or international sales or operations?",
    helperText: "Cross-border sales bring additional liability exposure.",
    options: [
      { label: "No", value: "no" },
      { label: "Yes", value: "yes" },
    ],
    defaultNextQuestionId: "agritourism",
    underwritingRules: [
      {
        operator: "equals",
        value: "yes",
        decision: "refer",
        message:
          "US or international sales/operations bring cross-border liability exposure that requires underwriter review.",
      },
    ],
    summaryLabel: "US / Intl Sales",
    summarySection: "Earnings & Profits",
  },
  {
    id: "agritourism",
    type: "toggle",
    brokerText:
      "Do you run any public-access or agritourism operations — farm tours, U-pick, petting zoo, bed & breakfast, hay rides, or special events?",
    helperText: "Public access on the farm is a distinct liability exposure.",
    options: [
      { label: "No", value: "no" },
      { label: "Yes — one or more", value: "yes" },
    ],
    defaultNextQuestionId: "other_operations",
    underwritingRules: [
      {
        operator: "equals",
        value: "yes",
        decision: "refer",
        message:
          "Public-access / agritourism operations (tours, U-pick, petting zoo, B&B, events) require underwriter review of the additional liability exposure.",
      },
    ],
    summaryLabel: "Agritourism / Public Access",
    summarySection: "Earnings & Profits",
  },
  {
    id: "other_operations",
    type: "text",
    brokerText: "Are there any other operations carried out on the farm by any person? (Type 'None' if not.)",
    placeholder: "e.g. Small welding side-business",
    defaultNextQuestionId: "cannabis_unlicensed",
    summaryLabel: "Other Operations",
    summarySection: "Earnings & Profits",
  },
  {
    id: "cannabis_unlicensed",
    type: "toggle",
    brokerText:
      "Has this premises ever been used to grow cannabis beyond the legal household limit without a licence?",
    helperText:
      "We do not accept cannabis/marijuana operations of any kind beyond the legal personal limit.",
    options: [
      { label: "No", value: "no" },
      { label: "Yes", value: "yes" },
    ],
    defaultNextQuestionId: "storage_tanks",
    underwritingRules: [
      {
        operator: "equals",
        value: "yes",
        decision: "decline",
        message:
          "Premises used to grow cannabis beyond the legal limit without a licence fall outside our underwriting appetite.",
      },
    ],
    summaryLabel: "Unlicensed Cannabis Use",
    summarySection: "Earnings & Profits",
  },

  // ════════════════════════════════════════════════════════
  // MODULE 8 — TANK DATA SUPPLEMENT
  // ════════════════════════════════════════════════════════
  {
    id: "storage_tanks",
    type: "toggle",
    brokerText: "Do you have any storage tanks with more than 500 gallons of capacity?",
    options: [
      { label: "No", value: "no" },
      { label: "Yes", value: "yes" },
    ],
    defaultNextQuestionId: "liability_limit",
    conditionalBranches: [
      { when: { operator: "equals", value: "yes" }, nextQuestionId: "tank_product" },
    ],
    underwritingRules: [
      {
        operator: "equals",
        value: "yes",
        decision: "refer",
        message:
          "Storage tanks over 500 gallons require a tank-data review for pollution exposure before binding.",
      },
    ],
    summaryLabel: "Tanks > 500 gal",
    summarySection: "Tank Data",
  },
  {
    id: "tank_product",
    type: "choice",
    brokerText: "What is stored in the largest tank?",
    options: [
      { label: "Fuel (diesel / gas)", value: "fuel", emoji: "⛽" },
      { label: "Liquid fertilizer", value: "fertilizer", emoji: "🧪" },
      { label: "Chemical / pesticide", value: "chemical", emoji: "☣️" },
      { label: "Water", value: "water", emoji: "💧" },
      { label: "Other", value: "other", emoji: "🛢️" },
    ],
    defaultNextQuestionId: "tank_capacity",
    summaryLabel: "Tank Product",
    summarySection: "Tank Data",
  },
  {
    id: "tank_capacity",
    type: "number",
    brokerText: "What is the capacity of the largest tank?",
    placeholder: "e.g. 1000",
    min: 500,
    max: 1000000,
    suffix: "gallons",
    defaultNextQuestionId: "tank_double_walled",
    summaryLabel: "Tank Capacity",
    summarySection: "Tank Data",
  },
  {
    id: "tank_double_walled",
    type: "toggle",
    brokerText: "Is the tank double-walled or fitted with secondary containment?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
    defaultNextQuestionId: "liability_limit",
    summaryLabel: "Tank Containment",
    summarySection: "Tank Data",
  },

  // ════════════════════════════════════════════════════════
  // MODULE 9 — LIABILITY
  // ════════════════════════════════════════════════════════
  {
    id: "liability_limit",
    type: "choice",
    brokerText: "What farm liability limit would you like?",
    options: [
      { label: "$1 Million", value: 1000000, description: "Standard" },
      { label: "$2 Million", value: 2000000, description: "Most popular" },
      { label: "$5 Million", value: 5000000, description: "Highest" },
    ],
    defaultNextQuestionId: "clandestine_lab",
    ratingFactor: "liabilityLimit",
    summaryLabel: "Liability Limit",
    summarySection: "Liability",
  },
  {
    id: "clandestine_lab",
    type: "toggle",
    brokerText:
      "Are you aware of any clandestine (synthetic drug) lab operations ever taking place in a structure on the premises?",
    options: [
      { label: "No", value: "no" },
      { label: "Yes", value: "yes" },
    ],
    defaultNextQuestionId: "chemical_handling",
    underwritingRules: [
      {
        operator: "equals",
        value: "yes",
        decision: "decline",
        message:
          "Clandestine (synthetic drug) lab operations fall outside our underwriting appetite.",
      },
    ],
    summaryLabel: "Clandestine Lab",
    summarySection: "Liability",
  },
  {
    id: "chemical_handling",
    type: "toggle",
    brokerText:
      "Do you sell, store, or process pesticides, herbicides, or chemicals for anyone other than your own use?",
    options: [
      { label: "No — own use only", value: "no" },
      { label: "Yes — for others", value: "yes" },
    ],
    defaultNextQuestionId: "env_compliance",
    underwritingRules: [
      {
        operator: "equals",
        value: "yes",
        decision: "refer",
        message:
          "Selling, storing, or processing chemicals for others creates a pollution/products exposure that requires underwriter review.",
      },
    ],
    summaryLabel: "Chemicals for Others",
    summarySection: "Liability",
  },
  {
    id: "env_compliance",
    type: "choice",
    brokerText:
      "Regarding environmental regulations (federal, provincial, municipal) — which best describes your status?",
    options: [
      { label: "Aware and compliant", value: "compliant", emoji: "✅" },
      { label: "Not aware of any that apply", value: "not_aware", emoji: "❔" },
      { label: "Aware of areas I don't comply with", value: "non_compliant", emoji: "⚠️" },
    ],
    defaultNextQuestionId: "bodies_of_water",
    underwritingRules: [
      {
        operator: "equals",
        value: "non_compliant",
        decision: "refer",
        message:
          "Known non-compliance with environmental regulations requires underwriter review.",
      },
    ],
    summaryLabel: "Environmental Compliance",
    summarySection: "Liability",
  },
  {
    id: "bodies_of_water",
    type: "toggle",
    brokerText:
      "Are there any bodies of water, streams, or environmentally protected areas on the property?",
    options: [
      { label: "No", value: "no" },
      { label: "Yes", value: "yes" },
    ],
    defaultNextQuestionId: "prior_losses",
    summaryLabel: "Water / Protected Areas",
    summarySection: "Liability",
  },

  // ════════════════════════════════════════════════════════
  // MODULE 10 — LOSS HISTORY
  // ════════════════════════════════════════════════════════
  {
    id: "prior_losses",
    type: "choice",
    brokerText: "How many insurance losses has the farm had in the last 5 years?",
    options: [
      { label: "None", value: 0, emoji: "✅" },
      { label: "1 loss", value: 1, emoji: "1️⃣" },
      { label: "2 losses", value: 2, emoji: "2️⃣" },
      { label: "3 or more", value: "3+", emoji: "⚠️" },
    ],
    defaultNextQuestionId: "sum_insured",
    conditionalBranches: [
      { when: { operator: "equals", value: 1 },    nextQuestionId: "loss_cause" },
      { when: { operator: "equals", value: 2 },    nextQuestionId: "loss_cause" },
      { when: { operator: "equals", value: "3+" }, nextQuestionId: "loss_cause" },
    ],
    underwritingRules: [
      {
        operator: "equals",
        value: "3+",
        decision: "refer",
        message:
          "Three or more losses within 5 years requires manual underwriter review.",
      },
    ],
    ratingFactor: "priorLosses",
    summaryLabel: "Losses (5 yrs)",
    summarySection: "Loss History",
  },
  {
    id: "loss_cause",
    type: "choice",
    brokerText: "What was the nature of the most recent loss?",
    options: [
      { label: "Fire", value: "fire", emoji: "🔥" },
      { label: "Wind / hail", value: "wind", emoji: "🌪️" },
      { label: "Water", value: "water", emoji: "💧" },
      { label: "Theft / vandalism", value: "theft", emoji: "🦹" },
      { label: "Liability", value: "liability", emoji: "⚖️" },
      { label: "Other", value: "other", emoji: "📋" },
    ],
    defaultNextQuestionId: "loss_largest_amount",
    summaryLabel: "Most Recent Loss — Cause",
    summarySection: "Loss History",
  },
  {
    id: "loss_largest_amount",
    type: "choice",
    brokerText: "Roughly how large was the biggest loss?",
    helperText: "An approximate amount is fine.",
    options: [
      { label: "Under $25,000", value: "under_25k", emoji: "💵" },
      { label: "$25,000 – $100,000", value: "k25_100", emoji: "💰" },
      { label: "$100,000 – $500,000", value: "k100_500", emoji: "💴" },
      { label: "Over $500,000", value: "over_500k", emoji: "⚠️" },
    ],
    defaultNextQuestionId: "sum_insured",
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

  // ════════════════════════════════════════════════════════
  // MODULE 11 — PROPERTY & COVERAGE
  // ════════════════════════════════════════════════════════
  {
    id: "sum_insured",
    type: "currency",
    brokerText:
      "What is the total value (in CAD) to insure across the dwellings, outbuildings, equipment, and livestock? This becomes your sum insured.",
    helperText:
      "Add up the replacement value of the farm buildings, machinery, and stock you want covered.",
    placeholder: "1,500,000",
    min: 50000,
    max: 50000000,
    prefix: "$",
    defaultNextQuestionId: "deductible",
    underwritingRules: [
      {
        operator: "greater_than",
        value: 10000000,
        decision: "refer",
        message:
          "A total sum insured exceeding $10,000,000 CAD requires senior underwriter approval and a survey.",
      },
    ],
    summaryLabel: "Total Sum Insured",
    summarySection: "Property & Coverage",
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
    defaultNextQuestionId: "broker_contact_name",
    ratingFactor: "deductible",
    summaryLabel: "Deductible",
    summarySection: "Property & Coverage",
  },

  // ════════════════════════════════════════════════════════
  // MODULE 12 — BROKER INFORMATION
  // ════════════════════════════════════════════════════════
  {
    id: "broker_contact_name",
    type: "text",
    brokerText: "Now the brokerage details — what's the broker/agency contact name?",
    placeholder: "e.g. J. Smith, Prairie Insurance",
    defaultNextQuestionId: "broker_code",
    summaryLabel: "Broker Contact",
    summarySection: "Broker Information",
  },
  {
    id: "broker_code",
    type: "text",
    brokerText: "What's the broker code?",
    placeholder: "e.g. PR-2048",
    defaultNextQuestionId: "broker_narrative",
    summaryLabel: "Broker Code",
    summarySection: "Broker Information",
  },
  {
    id: "broker_narrative",
    type: "text",
    brokerText: "Any broker narrative or notes to add for the underwriter? (Type 'None' if not.)",
    placeholder: "e.g. Long-standing client, well-maintained yard",
    defaultNextQuestionId: "contact_phone",
    summaryLabel: "Broker Notes",
    summarySection: "Broker Information",
  },

  // ════════════════════════════════════════════════════════
  // CONTACT
  // ════════════════════════════════════════════════════════
  {
    id: "contact_phone",
    type: "text",
    inputType: "phone",
    brokerText:
      "Almost done, {{applicant_name}}! What's the best phone number to reach you?",
    helperText: "We'll only use this to discuss the quote if needed.",
    placeholder: "e.g. (306) 555-0142",
    defaultNextQuestionId: "contact_email",
    required: true,
    summaryLabel: "Phone",
    summarySection: "Contact",
  },
  {
    id: "contact_email",
    type: "text",
    inputType: "email",
    brokerText: "And last one — what email address should we send the quote to?",
    helperText: "We'll email a copy of the full quote summary.",
    placeholder: "you@example.com",
    defaultNextQuestionId: "__SUBMIT__",
    required: true,
    summaryLabel: "Email",
    summarySection: "Contact",
  },
];

export const FARM_FIRST_QUESTION_ID = "applicant_name";
