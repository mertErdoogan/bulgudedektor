CREATE TABLE "cart_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"customer_id" text,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reminded_at" timestamp with time zone,
	"recovered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"customer_id" text NOT NULL,
	"product_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_customer_id_product_id_pk" PRIMARY KEY("customer_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"subject_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_resets_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "product_activity" (
	"product_id" text NOT NULL,
	"hour" timestamp with time zone NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"carts" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_activity_product_id_hour_pk" PRIMARY KEY("product_id","hour")
);
--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "author_name" SET DEFAULT 'Arena Dedektör Uzman Ekibi';--> statement-breakpoint
ALTER TABLE "cart_snapshots" ADD CONSTRAINT "cart_snapshots_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_activity" ADD CONSTRAINT "product_activity_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_snapshots_email_idx" ON "cart_snapshots" USING btree ("email");--> statement-breakpoint
CREATE INDEX "product_activity_hour_idx" ON "product_activity" USING btree ("hour");