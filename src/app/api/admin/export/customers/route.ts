import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { audit } from "@/lib/audit";
import { getStaff } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { can } from "@/lib/permissions";

// Sadece pazarlama izni (İYS) olan müşteriler dışa aktarılır.
export async function GET() {
  const staff = await getStaff();
  if (!staff || !can(staff.permissions, "customers.manage")) return new Response("Yetkisiz", { status: 403 });
  const rows = await db.select().from(customers).where(eq(customers.marketingConsent, true)).orderBy(desc(customers.createdAt));
  await audit(staff.id, "export", "customer", null, `İzinli müşteri listesi (${rows.length})`);
  return csvResponse(`izinli-musteriler-${new Date().toISOString().slice(0, 10)}.csv`, [
    ["Ad", "E-posta", "Telefon", "İzin tarihi", "Etiketler"],
    ...rows.map((c) => [c.name, c.email, c.phone, c.consentAt?.toISOString().slice(0, 10), c.tags.join(",")]),
  ]);
}
