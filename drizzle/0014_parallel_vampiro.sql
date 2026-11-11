ALTER TABLE "orders" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
-- Mevcut ödenmiş siparişler için ödeme anı = sipariş anı
UPDATE "orders" SET "paid_at" = "created_at" WHERE "payment_status" = 'PAID' AND "paid_at" IS NULL;
