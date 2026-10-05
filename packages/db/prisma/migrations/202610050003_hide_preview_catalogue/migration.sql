-- Keep old preview catalogue rows available for staff review, but remove them
-- from customer search and browsing. The former preview seed used these slugs.
UPDATE "catalog_listings"
SET "isPublished" = false
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
