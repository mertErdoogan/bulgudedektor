-- Arama normalleştirme fonksiyonu yeni adla; eski adlı fonksiyon (ve ona bağlı dizin) kaldırılır
CREATE OR REPLACE FUNCTION site_norm(t text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT translate(lower(translate(coalesce(t, ''), 'İIÇĞÖŞÜ', 'iicgosu')), 'çğıöşüâîû', 'cgiosuaiu') $$;
--> statement-breakpoint
DROP INDEX IF EXISTS product_name_trgm_idx;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS product_name_trgm_idx ON products USING gin (site_norm(name) gin_trgm_ops);
--> statement-breakpoint
DO $$
DECLARE f regprocedure;
BEGIN
  FOR f IN SELECT p.oid::regprocedure FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname LIKE '%\_norm' AND p.proname <> 'site_norm' LOOP
    EXECUTE 'DROP FUNCTION ' || f::text;
  END LOOP;
END $$;
--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "author_name" SET DEFAULT 'Derinova Uzman Ekibi';
--> statement-breakpoint
UPDATE "users" SET "email" = split_part("email", '@', 1) || '@derinova.local' WHERE "email" LIKE '%@%dedektor.local';
