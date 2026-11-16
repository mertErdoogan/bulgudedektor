ALTER TYPE "public"."payment_method" ADD VALUE 'CASH';--> statement-breakpoint
ALTER TYPE "public"."serial_status" ADD VALUE 'LOST';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "sales_user_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "manual_discount" numeric(12, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "fx_currency" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "fx_price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "service_records" ADD COLUMN "accessories" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_sales_user_id_users_id_fk" FOREIGN KEY ("sales_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Para ve müşteri listesi için ayrı yetkiler: iade yetkisi olan (para işine güvenilen) roller havale onayını,
-- ekip yöneten roller müşteri dışa aktarmayı alır. Satış uzmanı ikisini de kaybeder (önceden sipariş/müşteri yetkisiyle yapabiliyordu).
UPDATE "roles" SET "permissions" = array_append("permissions", 'payments.confirm') WHERE 'orders.refund' = ANY("permissions") AND NOT ('payments.confirm' = ANY("permissions"));--> statement-breakpoint
UPDATE "roles" SET "permissions" = array_append("permissions", 'customers.export') WHERE 'users.manage' = ANY("permissions") AND NOT ('customers.export' = ANY("permissions"));--> statement-breakpoint
-- Küçük mağaza için hazır rol: satış + stok + servis; maliyet, ciro, para onayı ve ayar yok
INSERT INTO "roles" ("id", "key", "name", "description", "permissions", "is_system")
SELECT gen_random_uuid()::text, 'store', 'Mağaza personeli', 'Showroom çalışanı: satış, mesaj, stok, seri no ve servis. Maliyet, ciro, havale onayı ve müşteri listesi indirme yok.',
  ARRAY['dashboard.view','products.view','orders.view','orders.manage','customers.view','customers.manage','inbox.manage','reviews.manage','inventory.manage','service.manage']::text[], false
WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "key" = 'store');
