CREATE TABLE "translations" (
	"id" text PRIMARY KEY NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"locale" text NOT NULL,
	"field" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "translations_entity_field_idx" ON "translations" USING btree ("entity","entity_id","locale","field");--> statement-breakpoint
CREATE INDEX "translations_lookup_idx" ON "translations" USING btree ("entity","locale");