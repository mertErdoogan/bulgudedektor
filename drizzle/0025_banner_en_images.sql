ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "image_url_en" text;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "mobile_image_url_en" text;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "author_name" SET DEFAULT 'Uzman Ekibi';
