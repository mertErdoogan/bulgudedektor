ALTER TABLE "orders" ADD COLUMN "channel" text DEFAULT 'WEB' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "external_ref" text;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_external_ref_unique" UNIQUE("external_ref");