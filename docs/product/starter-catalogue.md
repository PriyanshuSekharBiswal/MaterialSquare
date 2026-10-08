# Catalogue data policy

The storefront uses the client's published inventory. Historical migrations
contain editable manufacturer/reference product families and legacy starter
rows; they are not client-approved listings. Cleanup migrations keep them
unpublished and remove research prices, offers, stock, minimums, reference
images, and price source notes from their sellable variants. Staff must replace
or confirm every client-facing detail before publishing. Add client-supplied
imagery only with permission. Unpublished records stay out of customer search
and category counts until staff explicitly publish them.

The migration `202610050012_unpublish_unapproved_catalogue` hides rows from the
retired sample catalogue by stable slug as well as rows that still carry the
old empty-draft defaults. Migration
`202610080006_clear_unapproved_catalogue_values` removes unapproved commercial
and image values from the later reference catalogue; migration
`202610080007_clear_legacy_starter_values` does the same for known legacy
starter rows. Both keep rows editable in admin. Staff should still verify that
a retained name, brand, pack, or specification matches the client's actual
inventory.
