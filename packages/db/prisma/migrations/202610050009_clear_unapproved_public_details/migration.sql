-- Remove only the old compiled defaults. Preserve values the client has already edited.
UPDATE "website_content"
SET "content" = jsonb_set("content", '{contact.phone}', '""'::jsonb)
WHERE "content"->>'contact.phone' = '9773505015';

UPDATE "website_content"
SET "content" = jsonb_set("content", '{contact.phoneDisplay}', '""'::jsonb)
WHERE "content"->>'contact.phoneDisplay' = '+91 97735 05015';

UPDATE "website_content"
SET "content" = jsonb_set("content", '{contact.email}', '""'::jsonb)
WHERE "content"->>'contact.email' = 'orders@materialsquare.in';

UPDATE "website_content"
SET "content" = jsonb_set("content", '{contact.location}', '""'::jsonb)
WHERE "content"->>'contact.location' = 'Serving Delhi NCR (Noida, Greater Noida, Delhi, Gurugram, Ghaziabad & Faridabad)';

UPDATE "website_content"
SET "content" = jsonb_set("content", '{contact.officeAddress}', '""'::jsonb)
WHERE "content"->>'contact.officeAddress' = 'Plot 42, Mohan Nagar Link Road, Industrial Area, Ghaziabad, Uttar Pradesh 201007';

UPDATE "website_content"
SET "content" = jsonb_set("content", '{contact.coverageTitle}', '"Delivery information"'::jsonb)
WHERE "content"->>'contact.coverageTitle' = 'Confirm coverage for your site.';

UPDATE "website_content"
SET "content" = jsonb_set("content", '{contact.coverageDescription}', '"Ask the team to confirm site coverage, delivery timing, and any applicable charges for your request."'::jsonb)
WHERE "content"->>'contact.coverageDescription' = 'Serving Delhi NCR (Noida, Greater Noida, Delhi, Gurugram, Ghaziabad & Faridabad). Coverage, product availability, delivery timing, and any site charges are confirmed by staff for each request.';

UPDATE "website_content"
SET "content" = jsonb_set("content", '{footer.socialLinks}', '"[]"'::jsonb)
WHERE "content"->>'footer.socialLinks' LIKE '%instagram.com/materialsquare.in%';

UPDATE "website_content"
SET "content" = jsonb_set("content", '{home.slogan}', '""'::jsonb)
WHERE "content"->>'home.slogan' = 'Aap Construction Sambhaliye, Material Hum Sambhalenge.';

UPDATE "website_content"
SET "content" = jsonb_set("content", '{footer.slogan}', '""'::jsonb)
WHERE "content"->>'footer.slogan' = 'Aap Construction Sambhaliye, Material Hum Sambhalenge.';

UPDATE "website_content"
SET "content" = jsonb_set("content", '{home.title}', '"Find materials for your project"'::jsonb)
WHERE "content"->>'home.title' = 'Why Make 5 Calls?' || chr(10) || 'One Call. All Materials.';

UPDATE "website_content"
SET "content" = jsonb_set("content", '{home.description}', '"Search products and brands in the catalogue. Add the items and quantities you need, then prepare a request for the team."'::jsonb)
WHERE "content"->>'home.description' = 'Browse products and brands published in the current catalogue. Add the quantities you need to a quote list, then contact the Material Square team by WhatsApp or email to confirm price, stock, taxes, and delivery details.';

UPDATE "website_content"
SET "content" = jsonb_set("content", '{home.calloutTitle}', '"Build your material list"'::jsonb)
WHERE "content"->>'home.calloutTitle' = '"Ghar banana tha... Material ki list khatam hi nahi ho rahi!"';

UPDATE "website_content"
SET "content" = jsonb_set("content", '{home.calloutDescription}', '"Add products and quantities to your list, then review your request before copying or sending it."'::jsonb)
WHERE "content"->>'home.calloutDescription' = 'Add products to your list or describe your requirements. Review the message, then send it to the team by WhatsApp or email.';

UPDATE "website_content"
SET "content" = jsonb_set("content", '{footer.calloutDescription}', '"Build a material list and prepare a request with the products and quantities you need."'::jsonb)
WHERE "content"->>'footer.calloutDescription' = 'Send your material list or site requirements to the team by WhatsApp or phone. Staff can confirm product and delivery details.';

UPDATE "website_content"
SET "content" = jsonb_set("content", '{footer.description}', '"Browse published products and keep a quote list in this browser while you plan your request."'::jsonb)
WHERE "content"->>'footer.description' = 'Browse construction materials, keep a quote list in this browser, and contact the Material Square team to confirm product and delivery details.';
