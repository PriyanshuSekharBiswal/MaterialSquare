/**
 * Material Square — Official Construction Marketplace Data
 * "Why Make 5 Calls? One Call. All Materials."
 * "Aap Construction Sambhaliye, Material, Hum."
 */

export const COMPANY_INFO = {
  name: 'Material Square',
  tagline: 'Building Better Together',
  sloganHindi: 'Aap Construction Sambhaliye, Material Hum Sambhalenge.',
  sloganEnglish: 'You Manage the Construction, We Deliver the Materials.',
  pitch: 'Why Make 5 Calls? One Call. All Materials.',
  phone: '9773505015',
  phoneDisplay: '+91 97735 05015',
  whatsappUrl: 'https://wa.me/919773505015?text=Material%20Square%20%E2%80%94%20General%20Enquiry%0A%0AHello,%20I%20would%20like%20help%20with%20construction%20materials%20for%20my%20project.',
  handle: '@materialsquare.in',
  instagramUrl: 'https://www.instagram.com/materialsquare.in',
  location: 'Serving Delhi NCR (Noida, Greater Noida, Delhi, Gurugram, Ghaziabad & Faridabad)',
  officeCity: 'Ghaziabad',
  officeAddress: 'Plot 42, Mohan Nagar Link Road, Industrial Area, Ghaziabad, Uttar Pradesh 201007',
  officeCoordinates: { lat: 28.6791, lng: 77.382 },
  officeGoogleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=28.6791,77.3820+(Material+Square+Central+Office+Ghaziabad)',
  depotAddress: 'Central Fulfillment Depot, Plot 42, Mohan Nagar Link Road, Ghaziabad, Delhi NCR',
  email: 'orders@materialsquare.in',
  hours: 'Mon — Sat: 8:00 AM – 8:00 PM (Emergency Site Dispatch Available)',
};

export const CATEGORIES = [
  { id: 'all', label: 'All Materials', count: 22 },
  { id: 'cement', label: 'Cement & Aggregates', count: 4 },
  { id: 'pipes', label: 'Pipes & Fittings', count: 6 },
  { id: 'wires', label: 'Wires & Electrical', count: 4 },
  { id: 'steel', label: 'Steel & Reinforcement', count: 1 },
  { id: 'paints', label: 'Paints & Wall Prep', count: 4 },
  { id: 'sanitary', label: 'Sanitary & Bath', count: 2 },
  { id: 'adhesives', label: 'Adhesives & Grouts', count: 1 },
];

// This legacy catalogue is retained only as a one-time migration baseline for
// the hosted demo database. Its technical copy was drafted before the client
// supplied SKU sheets and must never be presented as verified product data.
const PREVIEW_PRODUCT_ROWS = [
  {
    "id": "ultratech-super",
    "code": "MS-CEM-01",
    "name": "UltraTech Super Weather Plus Cement",
    "brand": "UltraTech Cement",
    "brandTagline": "The Engineer's Choice",
    "category": "cement",
    "categoryLabel": "Cement & Aggregates",
    "unit": "50 Kg HDPE Bag",
    "image": "/images/products/material-sack-illustration.png"
  },
  {
    "id": "ambuja-kawach",
    "code": "MS-CEM-02",
    "name": "Ambuja Kawach Water Shield Cement",
    "brand": "Ambuja Cement",
    "brandTagline": "Giant Compressive Strength",
    "category": "cement",
    "categoryLabel": "Cement & Aggregates",
    "unit": "50 Kg Bag",
    "image": "/images/products/material-sack-illustration.png"
  },
  {
    "id": "jk-super-cement",
    "code": "MS-CEM-03",
    "name": "JK Super Strong OPC 53 Grade Cement",
    "brand": "JK Cement",
    "brandTagline": "Build Safe & Strong",
    "category": "cement",
    "categoryLabel": "Cement & Aggregates",
    "unit": "50 Kg Bag",
    "image": "/images/products/material-sack-illustration.png"
  },
  {
    "id": "shree-cement-roofon",
    "code": "MS-CEM-04",
    "name": "Shree Roofon Concrete Master Cement",
    "brand": "Shree Cement",
    "brandTagline": "Master Concrete Solution",
    "category": "cement",
    "categoryLabel": "Cement & Aggregates",
    "unit": "50 Kg Laminated Bag",
    "image": "/images/products/material-sack-illustration.png"
  },
  {
    "id": "astral-cpvc-pro",
    "code": "MS-PIP-01",
    "name": "Astral CPVC PRO Hot & Cold Water Pipes",
    "brand": "Astral Pipes",
    "brandTagline": "CPVC Pro & Lead Free",
    "category": "pipes",
    "categoryLabel": "Pipes & Fittings",
    "unit": "3 & 5 Meter Lengths (SDR 11 & SDR 13.5)",
    "image": "/images/products/cpvc-pipe-illustration.png"
  },
  {
    "id": "supreme-swr-pipes",
    "code": "MS-PIP-02",
    "name": "Supreme SWR Drainage Ring-Fit Pipes",
    "brand": "Supreme Industries",
    "brandTagline": "People Who Know Plastics Best",
    "category": "pipes",
    "categoryLabel": "Pipes & Fittings",
    "unit": "3 Meter & 6 Meter Lengths",
    "image": "/images/products/pvc-drainage-illustration.png"
  },
  {
    "id": "finolex-upvc-pipes",
    "code": "MS-PIP-03",
    "name": "Finolex Lead-Free UPVC Cold Water Plumbing Pipes",
    "brand": "Finolex Pipes",
    "brandTagline": "Pipes & Fittings",
    "category": "pipes",
    "categoryLabel": "Pipes & Fittings",
    "unit": "3 & 6 Meter Lengths (SCH 40 & SCH 80)",
    "image": "/images/products/upvc-pipe-illustration.png"
  },
  {
    "id": "zoloto-brass-valves",
    "code": "MS-PIP-04",
    "name": "Zoloto Forged Brass & Bronze Ball Valves",
    "brand": "Zoloto Valves",
    "brandTagline": "Forged Brass & Bronze Engineering",
    "category": "pipes",
    "categoryLabel": "Pipes & Fittings",
    "unit": "Box Pack with Quality Tag",
    "image": "/images/products/brass-valve-illustration.png"
  },
  {
    "id": "polycab-fr-wires",
    "code": "MS-ELE-01",
    "name": "Polycab Green Wire FR-LSH Flame Retardant",
    "brand": "Polycab Wires",
    "brandTagline": "Ideas. Connected.",
    "category": "wires",
    "categoryLabel": "Wires & Electrical",
    "unit": "90 Meter Box / Coil",
    "image": "/images/products/copper-wire-illustration.png"
  },
  {
    "id": "havells-lifeline-plus",
    "code": "MS-ELE-02",
    "name": "Havells LifeLine Plus HR-FR S3 Wires",
    "brand": "Havells India",
    "brandTagline": "Wires That Never Catch Fire",
    "category": "wires",
    "categoryLabel": "Wires & Electrical",
    "unit": "90 Meter Coil Pack",
    "image": "/images/products/copper-wire-illustration.png"
  },
  {
    "id": "finolex-flame-retardant",
    "code": "MS-ELE-03",
    "name": "Finolex Flame Retardant (FR) PVC Wires",
    "brand": "Finolex Cables Limited",
    "brandTagline": "Cables Limited",
    "category": "wires",
    "categoryLabel": "Wires & Electrical",
    "unit": "90 Meter Box",
    "image": "/images/products/copper-wire-illustration.png"
  },
  {
    "id": "tata-tiscon-550d",
    "code": "MS-STL-01",
    "name": "Tata Tiscon 550D Super Ductile TMT Rebars",
    "brand": "Tata Tiscon",
    "brandTagline": "Desh Ka Saria",
    "category": "steel",
    "categoryLabel": "Steel & Reinforcement",
    "unit": "Per Metric Ton (MT) / Bundles",
    "image": "/images/products/steel-rebar-illustration.png"
  },
  {
    "id": "asian-paints-apex-ultima",
    "code": "MS-PNT-01",
    "name": "Asian Paints Apex Ultima Weatherproof Emulsion",
    "brand": "Asian Paints",
    "brandTagline": "Har Ghar Kuch Kehta Hai",
    "category": "paints",
    "categoryLabel": "Paints & Wall Prep",
    "unit": "20 Liter Sealed Drum",
    "image": "/images/products/paint-bucket-illustration.png"
  },
  {
    "id": "birla-opus-paints",
    "code": "MS-PNT-02",
    "name": "Birla Opus Prime Luxury Interior Emulsion",
    "brand": "Birla Opus Paints",
    "brandTagline": "Rich Colours, Superior Finish",
    "category": "paints",
    "categoryLabel": "Paints & Wall Prep",
    "unit": "20 Liter Bucket",
    "image": "/images/products/paint-bucket-illustration.png"
  },
  {
    "id": "jk-wallmaxx-putty",
    "code": "MS-PNT-03",
    "name": "JK WallMaxX White Cement Wall Putty",
    "brand": "JK Cement",
    "brandTagline": "Bharose Ki Buniyaad",
    "category": "paints",
    "categoryLabel": "Paints & Wall Prep",
    "unit": "40 Kg Moisture-Proof Bag",
    "image": "/images/products/white-putty-illustration.png"
  },
  {
    "id": "jaquar-florentine-diverter",
    "code": "MS-SAN-01",
    "name": "Jaquar Florentine Concealed Diverter & Faucets",
    "brand": "Jaquar Bath + Light",
    "brandTagline": "Experience Bathing",
    "category": "sanitary",
    "categoryLabel": "Sanitary & Bath",
    "unit": "Box Pack with Concealed Body & Trim",
    "image": "/images/products/chrome-faucet-illustration.png"
  },
  {
    "id": "cera-rimless-ewc",
    "code": "MS-SAN-02",
    "name": "CERA Italian Collection Rimless Wall-Hung EWC",
    "brand": "CERA Sanitaryware",
    "brandTagline": "Style Jo Dikhe, Quality Jo Chale",
    "category": "sanitary",
    "categoryLabel": "Sanitary & Bath",
    "unit": "Complete Set (Toilet Bowl + Soft Close Seat + Tank)",
    "image": "/images/products/wall-hung-toilet-illustration.png"
  },
  {
    "id": "myk-laticrete-adhesive",
    "code": "MS-ADH-01",
    "name": "MYK Laticrete 252 Silver High-Polymer Tile Adhesive",
    "brand": "MYK Laticrete",
    "brandTagline": "World Leader in Tile Adhesives",
    "category": "adhesives",
    "categoryLabel": "Adhesives & Grouts",
    "unit": "20 Kg Bag",
    "image": "/images/products/material-sack-illustration.png"
  },
  {
    "id": "asian-paints-tractor-emulsion",
    "code": "MS-PNT-04",
    "name": "Asian Paints Tractor Emulsion · Base White",
    "brand": "Asian Paints",
    "brandTagline": "Interior wall finish",
    "category": "paints",
    "categoryLabel": "Paints & Wall Prep",
    "unit": "Sealed pack",
    "image": "/images/products/paint-bucket-illustration.png"
  },
  {
    "id": "polycab-etira-fr-wire",
    "code": "MS-ELE-05",
    "name": "Polycab Etira FR House Wire · 1.5 sq mm · 90 m",
    "brand": "Polycab",
    "brandTagline": "Wires & Cables",
    "category": "wires",
    "categoryLabel": "Wires & Electrical",
    "unit": "90 m coil",
    "image": "/images/products/copper-wire-illustration.png"
  },
  {
    "id": "supreme-cpvc-quote-sample",
    "code": "MS-PIP-05",
    "name": "CPVC Pipes & Fittings · Sample Quotation Lines",
    "brand": "Supreme (as written on sample quotation)",
    "brandTagline": "CPVC plumbing range",
    "category": "pipes",
    "categoryLabel": "Pipes & Fittings",
    "unit": "Select item",
    "image": "/images/products/cpvc-pipe-illustration.png"
  },
  {
    "id": "supreme-agricultural-solvent-sample",
    "code": "MS-PIP-06",
    "name": "PVC-U Solvent Cement · Sample Quotation Line",
    "brand": "Supreme (as written on sample quotation)",
    "brandTagline": "PVC-U jointing product",
    "category": "pipes",
    "categoryLabel": "Pipes & Fittings",
    "unit": "500 ml tin",
    "image": "/images/products/cpvc-pipe-illustration.png"
  }
] as const;

const PREVIEW_PRODUCT_CONTENT = {
  cement: { features: ['Confirm the cement type and grade on the current product bag.'], applications: ['Ask staff to confirm suitability for the intended project.'] },
  pipes: { features: ['Confirm pipe material, diameter, class, length, and fittings for the required system.'], applications: ['Check product compatibility against current manufacturer documentation.'] },
  wires: { features: ['Confirm the product series, conductor size, colour, and coil length from the product label.'], applications: ['Have a qualified electrical professional confirm the required cable.'] },
  steel: { features: ['Confirm steel grade, bar diameter, length, and weight from the product markings.'], applications: ['Ask a qualified site professional to confirm the required specification.'] },
  paints: { features: ['Select a listed pack size; shade and tinting can affect the final product and price.'], applications: ['Confirm surface preparation and application instructions on the current product label.'] },
  sanitary: { features: ['Confirm the exact model, finish, included parts, and dimensions before purchase.'], applications: ['Ask staff to confirm model compatibility and included fittings.'] },
  adhesives: { features: ['Confirm product type, pack size, substrate, and installation instructions.'], applications: ['Check suitability against the product label and project specification.'] },
} as const;

// Sample names, sizes, and rates exist for functional testing only. The client
// must approve actual inventory before any listing is relied on or published.
export const PRODUCTS = PREVIEW_PRODUCT_ROWS.map((product) => ({
  ...product,
  packaging: product.unit,
  grade: '',
  description: 'Preview listing. Confirm the exact SKU, product details, and intended use with Material Square staff.',
  features: [...PREVIEW_PRODUCT_CONTENT[product.category].features],
  applications: [...PREVIEW_PRODUCT_CONTENT[product.category].applications],
  minOrderQty: 'Confirm with staff',
  inStock: false,
  dispatchTime: 'Confirm stock and delivery with staff',
  wholesaleRate: 'Indicative preview price only; confirm current price with staff',
  specs: {} as Record<string, string>,
}));

// Enquiry prompts only. This list does not recommend a conductor size or rating.
export const WIRE_SIZE_GUIDE = [
  {
    size: 'Project type and connected loads',
    gauge: 'To be specified',
    apps: 'Record each appliance and its nameplate rating.',
    maxLoad: 'Not calculated',
    applianceIcons: 'Appliances',
    recommendedBrand: 'Qualified electrical professional',
  },
  {
    size: 'Cable route and installation method',
    gauge: 'To be specified',
    apps: 'Record route length, installation method, grouping and environment.',
    maxLoad: 'Not calculated',
    applianceIcons: 'Cable route',
    recommendedBrand: 'Qualified electrical professional',
  },
  {
    size: 'Supply and protective devices',
    gauge: 'To be specified',
    apps: 'Provide the approved supply, earthing and protection design.',
    maxLoad: 'Not calculated',
    applianceIcons: 'Protection',
    recommendedBrand: 'Qualified electrical professional',
  },
  {
    size: 'Project standards and approved drawings',
    gauge: 'To be specified',
    apps: 'Use the engineer-approved design and applicable local requirements.',
    maxLoad: 'Not calculated',
    applianceIcons: 'Project documents',
    recommendedBrand: 'Qualified electrical professional',
  },
];

// General prompts for choosing a system. Model-specific limits belong to the
// exact manufacturer's current data sheet and project design.
export const PLUMBING_GUIDE = [
  {
    type: 'PVC PIPE',
    bestSuited: 'Confirm the intended system and duty with the project professional.',
    features: ['Exact product properties vary by model and manufacturer.'],
    waterType: 'Confirm intended service',
    tempSuitability: 'Check exact product data sheet',
    pressure: 'Confirm model and pressure class',
    cost: 'Confirm current staff-entered price',
    dos: 'Follow the exact product handling and installation instructions.',
    donts: 'Do not infer temperature, pressure or use limits from this generic category.',
  },
  {
    type: 'CPVC PIPE',
    bestSuited: 'Confirm the intended system and duty with the project professional.',
    features: ['Exact product properties vary by model and manufacturer.'],
    waterType: 'Confirm intended service',
    tempSuitability: 'Check exact product data sheet',
    pressure: 'Confirm model and pressure class',
    cost: 'Confirm current staff-entered price',
    dos: 'Check pipe, fitting, joining method and solvent compatibility in product documentation.',
    donts: 'Do not infer temperature, pressure or use limits from this generic category.',
  },
  {
    type: 'uPVC PIPE',
    bestSuited: 'Confirm the intended system and duty with the project professional.',
    features: ['Exact product properties vary by model and manufacturer.'],
    waterType: 'Confirm intended service',
    tempSuitability: 'Check exact product data sheet',
    pressure: 'Confirm model and pressure class',
    cost: 'Confirm current staff-entered price',
    dos: 'Use the handling, storage and installation guidance for the exact product.',
    donts: 'Do not infer temperature, pressure or use limits from this generic category.',
  },
];

// CONSTRUCTION BINGO (From official poster)
export const CONSTRUCTION_BINGO = [
  {
    id: 'wrong-size',
    title: 'Wrong Size Delivered',
    hindiSub: 'Saria ya pipe galat size ka aa gaya',
    pain: 'Site work halts for 2 days while suppliers argue over return and exchange.',
    solution: 'Material Square pre-verifies structural drawings & checks item sizes at our depot before loading.',
  },
  {
    id: 'extra-wastage',
    title: 'Extra Wastage & Broken Bags',
    hindiSub: 'Transport mein cement fati ya pipe toot gaya',
    pain: 'Poor stacking in open trucks leads to 8-15% site material loss.',
    solution: 'Standardized FIFO packing, covered dispatch trucks, and supervised offloading at your site gate.',
  },
  {
    id: 'last-minute',
    title: 'Last-Minute Purchase Rush',
    hindiSub: 'Dhalai ke din subah pata chala saria kam pad gaya',
    pain: 'Contractor forced to buy retail at 20% inflated emergency prices.',
    solution: 'Dedicated site manager tracking your slab casting dates with emergency same-day backup supply.',
  },
  {
    id: 'wrong-fitting',
    title: 'Wrong Pipe Fittings & Leaks',
    hindiSub: 'Tiles lagne ke baad plumbing line leak ho gayi',
    pain: 'Mixing cheap unbranded fittings with branded pipes causes internal wall leaks.',
    solution: '100% matched system fittings (Astral with Astral, Supreme with Supreme) with pressure test kits.',
  },
  {
    id: 'delayed-delivery',
    title: 'Delayed Delivery & Labour Idle',
    hindiSub: 'Mistri baitha hai, truck 5 ghante se traffic mein hai',
    pain: 'Site labour wages wasted while waiting for scattered suppliers.',
    solution: 'One single consolidated delivery on your exact time slot with live GPS dispatch tracking.',
  },
  {
    id: 'unclear-spec',
    title: 'Unclear Specifications & Duplicates',
    hindiSub: 'Brand ka naam tha par maal duplicate nikla',
    pain: 'Local dealers mix counterfeit cement or local rerolled steel.',
    solution: '100% Manufacturer Authorized Supply with authentic batch test certificates & GST invoices.',
  },
];

// SITE DELAY REASONS (From official poster)
export const SITE_DELAY_REASONS = [
  {
    problem: 'Poor Planning',
    desc: 'Activities start without proper sequencing and scheduling.',
    solution: 'Plan activities, dependencies and deadlines before execution with Material Square phase supply.',
  },
  {
    problem: 'Material Not Available On Time',
    desc: 'Required materials are unavailable when work reaches that stage.',
    solution: 'Plan material requirements in advance and coordinate procurement with project schedule.',
  },
  {
    problem: 'Site Coordination Gaps',
    desc: 'Poor coordination between teams causes idle time and interruptions.',
    solution: 'Maintain single point of contact between site supervisor, builder, and Material Square.',
  },
  {
    problem: 'Last-Minute Changes',
    desc: 'Changes during execution cause rework and schedule disruption.',
    solution: 'Finalize drawings, quantities and requirements before execution with our expert team.',
  },
];
