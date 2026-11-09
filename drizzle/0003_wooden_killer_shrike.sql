CREATE TYPE "public"."faq_kind" AS ENUM('FAQ', 'GLOSSARY');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "faq_kind" DEFAULT 'FAQ' NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"group" text DEFAULT 'Genel' NOT NULL,
	"product_id" text,
	"category_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"show_on_home" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"answer" text,
	"content" text DEFAULT '' NOT NULL,
	"cover_image" text,
	"category" text DEFAULT 'Rehber' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"author_name" text DEFAULT 'Bulgu Dedektör Uzman Ekibi' NOT NULL,
	"author_title" text,
	"author_bio" text,
	"status" "post_status" DEFAULT 'DRAFT' NOT NULL,
	"faq" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_product_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"related_category_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "redirects" (
	"id" text PRIMARY KEY NOT NULL,
	"from_path" text NOT NULL,
	"to_path" text NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redirects_from_path_unique" UNIQUE("from_path")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "seo_content" text;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_status_idx" ON "posts" USING btree ("status","published_at");