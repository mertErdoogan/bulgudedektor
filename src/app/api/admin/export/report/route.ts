import { audit } from "@/lib/audit";
import { getStaff } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { can } from "@/lib/permissions";
import { dailySeries, rangeFromParam, topProducts } from "@/lib/reports";

export async function GET(req: Request) {
  const staff = await getStaff();
  if (!staff || !can(staff.permissions, "reports.finance")) return new Response("Yetkisiz", { status: 403 });
  const sp = new URL(req.url).searchParams;
  const { start, end } = rangeFromParam(sp.get("r") ?? undefined, sp.get("bas") ?? undefined, sp.get("bit") ?? undefined);
  await audit(staff.id, "export", "report", null, `Rapor CSV: ${sp.get("tip")}`);
  if (sp.get("tip") === "urun") {
    const rows = await topProducts(start, end, 1000);
    return csvResponse("urun-raporu.csv", [["Ürün", "Adet", "Ciro", "Maliyet", "Brüt kâr"], ...rows.map((r) => [r.name, r.units, r.revenue, r.cost, r.revenue - r.cost])]);
  }
  const rows = await dailySeries(start, end);
  return csvResponse("gunluk-satis.csv", [["Tarih", "Sipariş", "Ciro"], ...rows.map((r) => [r.date, r.orders, r.value])]);
}
