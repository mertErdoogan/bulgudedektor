ALTER TABLE "customers" ADD COLUMN "card_user_key" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_no" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoiced_at" timestamp with time zone;