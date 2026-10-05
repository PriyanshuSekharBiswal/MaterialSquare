# Catalogue data policy

The storefront uses the client's published inventory. This repository does not
seed starter listings or make up product details. Add only products the client
confirms they sell, then enter the exact variants, images, price, stock,
minimum order and offer details the client approves. Unpublished records stay
out of customer search and category counts until staff explicitly publish
them.

The migration `202610050012_unpublish_unapproved_catalogue` hides rows from the
retired sample catalogue by stable slug as well as rows that still carry the
old empty-draft defaults. It keeps those rows in the admin database for review;
staff may edit or remove them after checking whether any are client data.
