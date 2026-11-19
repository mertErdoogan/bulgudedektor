CREATE TABLE "bundle_items" (
	"id" text PRIMARY KEY NOT NULL,
	"bundle_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bundles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"discount_type" text DEFAULT 'PERCENT' NOT NULL,
	"discount_value" numeric(12, 2) DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_carts" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text,
	"email" text,
	"name" text,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"value" numeric(12, 2) DEFAULT 0 NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"path" text,
	"locale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ordered_at" timestamp with time zone,
	"order_id" text
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_provider" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_ref" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_status" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_error" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "bundle_discount" numeric(12, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "applied_bundles" jsonb;--> statement-breakpoint
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_bundle_id_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_carts" ADD CONSTRAINT "live_carts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_carts" ADD CONSTRAINT "live_carts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bundle_items_bundle_idx" ON "bundle_items" USING btree ("bundle_id");--> statement-breakpoint
CREATE INDEX "bundle_items_product_idx" ON "bundle_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "live_carts_updated_idx" ON "live_carts" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "live_carts_email_idx" ON "live_carts" USING btree ("email");