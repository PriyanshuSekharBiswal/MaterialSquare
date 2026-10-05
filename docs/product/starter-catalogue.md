# Starter catalogue

The explicit `npm run catalog:seed-starter` operation adds 50 published catalogue records spanning paints, cement and building products, pipes, and electrical wires. It is not run during application startup or database migration. It only creates missing slugs, so rerunning it preserves catalogue edits.

These records are a launch starting point chosen at the client's request. They have no product photos, colours or size variants, prices, offers, stock quantities, or minimum order quantities. Their availability is set to “check availability”; confirm commercial and variant details before relying on them. The client can edit or remove every listing in the admin catalogue workspace.

Product family names are based on manufacturer catalogue pages:

- [Asian Paints products](https://www.asianpaints.com/products.html) and [wood finishes](https://www.asianpaints.com/products/wood-finish/wood-for-interior.html)
- [Berger product finder](https://www.bergerpaints.com/product-finder), [Silk range](https://www.bergerpaints.com/products/interior-wall-coatings/brand/silk), and [Silk GlamArt range](https://www.bergerpaints.com/products/interior-wall-coatings/brand/silk-glamart)
- [UltraTech Building Products](https://www.ultratechcement.com/for-homebuilders/products/overview-building-product) and [cement products](https://www.ultratechcement.com/products/ultratech-cement.php)
- [Astral plumbing range](https://www.astralpipes.com/plumbing-pipes-fittings/)
- [Polycab cable range](https://www.polycab.com/cables)
