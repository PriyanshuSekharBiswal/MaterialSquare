/**
 * General plumbing enquiry prompts. Product-specific properties and limits
 * must come from the manufacturer's current documentation for the exact SKU.
 */
export const PLUMBING_GUIDE = [
  {
    type: "PVC PIPE",
    bestSuited: "Confirm the intended system and duty with the project professional.",
    features: ["Exact product properties vary by model and manufacturer."],
    waterType: "Confirm intended service",
    tempSuitability: "Check exact product data sheet",
    pressure: "Confirm model and pressure class",
    cost: "Confirm current staff-entered price",
    dos: "Follow the exact product handling and installation instructions.",
    donts: "Do not infer temperature, pressure or use limits from this generic category.",
  },
  {
    type: "CPVC PIPE",
    bestSuited: "Confirm the intended system and duty with the project professional.",
    features: ["Exact product properties vary by model and manufacturer."],
    waterType: "Confirm intended service",
    tempSuitability: "Check exact product data sheet",
    pressure: "Confirm model and pressure class",
    cost: "Confirm current staff-entered price",
    dos: "Check pipe, fitting, joining method and solvent compatibility in product documentation.",
    donts: "Do not infer temperature, pressure or use limits from this generic category.",
  },
  {
    type: "uPVC PIPE",
    bestSuited: "Confirm the intended system and duty with the project professional.",
    features: ["Exact product properties vary by model and manufacturer."],
    waterType: "Confirm intended service",
    tempSuitability: "Check exact product data sheet",
    pressure: "Confirm model and pressure class",
    cost: "Confirm current staff-entered price",
    dos: "Use the handling, storage and installation guidance for the exact product.",
    donts: "Do not infer temperature, pressure or use limits from this generic category.",
  },
];
