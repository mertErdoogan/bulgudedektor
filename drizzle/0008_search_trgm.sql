-- Akıllı arama: yazım hatasına dayanıklı (trigram) ve Türkçe karakter duyarsız arama
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION arena_norm(t text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT translate(lower(translate(coalesce(t, ''), 'İIÇĞÖŞÜ', 'iicgosu')), 'çğıöşüâîû', 'cgiosuaiu') $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS product_name_trgm_idx ON products USING gin (arena_norm(name) gin_trgm_ops);
