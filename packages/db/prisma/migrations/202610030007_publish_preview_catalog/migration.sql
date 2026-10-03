-- The owner requested all sample construction-material families be visible
-- for the first preview launch. Only publication state is changed here;
-- staff edits to descriptions, prices, stock, images and variants remain intact.
UPDATE "catalog_listings"
SET "isPublished" = TRUE,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" IN (
  'ultratech-super',
  'ambuja-kawach',
  'jk-super-cement',
  'shree-cement-roofon',
  'astral-cpvc-pro',
  'supreme-swr-pipes',
  'finolex-upvc-pipes',
  'zoloto-brass-valves',
  'polycab-fr-wires',
  'havells-lifeline-plus',
  'finolex-flame-retardant',
  'tata-tiscon-550d',
  'asian-paints-apex-ultima',
  'birla-opus-paints',
  'jk-wallmaxx-putty',
  'jaquar-florentine-diverter',
  'cera-rimless-ewc',
  'myk-laticrete-adhesive',
  'asian-paints-tractor-emulsion',
  'polycab-etira-fr-wire',
  'supreme-cpvc-quote-sample',
  'supreme-agricultural-solvent-sample'
);

-- Keep the existing preview price while providing a modest editable demo
-- volume schedule for the cement bag shown in the supplied quantity-offer UI.
UPDATE "catalog_listing_variants"
SET "quantityBreaks" = '[
  {"minimumQuantity": 10, "unitPrice": 395},
  {"minimumQuantity": 30, "unitPrice": 385},
  {"minimumQuantity": 50, "unitPrice": 375}
]'::jsonb,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'SEED-ultratech-super-1'
  AND "quantityBreaks" = '[]'::jsonb;
