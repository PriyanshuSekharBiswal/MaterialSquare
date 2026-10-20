-- Preserve managed pages created before FAQ and policy routes became reserved.
-- Keep each page's content and publication state, moving only conflicting URLs.
DO $migration$
DECLARE
  site_row record;
  source_pages jsonb;
  migrated_pages jsonb;
  page jsonb;
  old_path text;
  root_segment text;
  suffix_path text;
  base_path text;
  next_path text;
  suffix integer;
BEGIN
  FOR site_row IN
    SELECT "id", "content"
    FROM "website_content"
    WHERE jsonb_typeof("content") = 'object'
  LOOP
    BEGIN
      source_pages := (site_row."content"->>'website.pages')::jsonb;
    EXCEPTION WHEN others THEN
      CONTINUE;
    END;
    IF jsonb_typeof(source_pages) IS DISTINCT FROM 'array' THEN
      CONTINUE;
    END IF;

    migrated_pages := '[]'::jsonb;
    FOR page IN
      SELECT item.value
      FROM jsonb_array_elements(source_pages) WITH ORDINALITY AS item(value, position)
      ORDER BY item.position
    LOOP
      old_path := page->>'path';
      root_segment := split_part(old_path, '/', 2);
      IF root_segment IN ('faq', 'shipping', 'return-policy') THEN
        suffix_path := substr(old_path, length(root_segment) + 2);
        base_path := '/' || root_segment || '-custom' || suffix_path;
        next_path := base_path;
        suffix := 2;
        WHILE EXISTS (
          SELECT 1 FROM jsonb_array_elements(source_pages) AS existing(value)
          WHERE existing.value->>'path' = next_path
        ) OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(migrated_pages) AS existing(value)
          WHERE existing.value->>'path' = next_path
        ) LOOP
          next_path := base_path || '-' || suffix;
          suffix := suffix + 1;
        END LOOP;
        page := jsonb_set(page, '{path}', to_jsonb(next_path), false);
      END IF;
      migrated_pages := migrated_pages || jsonb_build_array(page);
    END LOOP;

    IF migrated_pages IS DISTINCT FROM source_pages THEN
      UPDATE "website_content"
      SET "content" = jsonb_set("content", '{website.pages}', to_jsonb(migrated_pages::text), false),
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = site_row."id";
    END IF;
  END LOOP;
END
$migration$;
