import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, newsletterSubscribers } from "@/db/schema";
import { audit } from "@/lib/audit";
import { getStaff } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { can } from "@/lib/permissions";

const iysDate = (d: Date | null | undefined) => {
  const x = d ?? new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())} ${p(x.getHours())}:${p(x.getMinutes())}:${p(x.getSeconds())}`;
};

/**
 * Sadece pazarlama izni olan müşteriler dışa aktarılır.
 *   ?format=iys → İleti Yönetim Sistemi toplu izin yükleme alanları (Alıcı, İzin tipi, Kaynak, Durum, İzin tarihi, Alıcı tipi).
 *                 Telefon için MESAJ (SMS), e-posta için EPOSTA satırı üretilir; bültene abone olup üye olmayanlar da eklenir.
 */
export async function GET(req: Request) {
  const staff = await getStaff();
  if (!staff || !can(staff.permissions, "customers.manage")) return new Response("Yetkisiz", { status: 403 });
  const format = new URL(req.url).searchParams.get("format");
  const rows = await db.select().from(customers).where(eq(customers.marketingConsent, true)).orderBy(desc(customers.createdAt));

  if (format === "iys") {
    const subs = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.isActive, true));
    const seen = new Set<string>();
    const out: (string | null)[][] = [["RECIPIENT", "TYPE", "SOURCE", "STATUS", "CONSENT_DATE", "RECIPIENT_TYPE"]];
    for (const c of rows) {
      if (c.email && !seen.has(c.email)) {
        seen.add(c.email);
        out.push([c.email, "EPOSTA", "HS_WEB", "ONAY", iysDate(c.consentAt ?? c.createdAt), "BIREYSEL"]);
      }
      if (c.phone) out.push([c.phone.startsWith("+") ? c.phone : `+${c.phone}`, "MESAJ", "HS_WEB", "ONAY", iysDate(c.consentAt ?? c.createdAt), "BIREYSEL"]);
    }
    for (const s of subs) {
      if (seen.has(s.email)) continue;
      seen.add(s.email);
      out.push([s.email, "EPOSTA", "HS_WEB", "ONAY", iysDate(s.consentAt), "BIREYSEL"]);
    }
    await audit(staff.id, "export", "customer", null, `İYS izin listesi (${out.length - 1} satır)`);
    return csvResponse(`iys-izinler-${new Date().toISOString().slice(0, 10)}.csv`, out);
  }

  await audit(staff.id, "export", "customer", null, `İzinli müşteri listesi (${rows.length})`);
  return csvResponse(`izinli-musteriler-${new Date().toISOString().slice(0, 10)}.csv`, [
    ["Ad", "E-posta", "Telefon", "İzin tarihi", "Etiketler"],
    ...rows.map((c) => [c.name, c.email, c.phone, c.consentAt?.toISOString().slice(0, 10), c.tags.join(",")]),
  ]);
}
