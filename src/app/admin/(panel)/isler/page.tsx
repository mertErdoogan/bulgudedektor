import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { PageHeader } from "@/components/admin/shell";
import { WorkList } from "@/components/admin/worklist";
import { requireStaff } from "@/lib/auth";
import { getWorklist, WORK_GROUPS } from "@/lib/worklist";

export const metadata = { title: "İş listesi" };

export default async function WorkPage() {
  const staff = await requireStaff("dashboard.view");
  const [work, team] = await Promise.all([getWorklist(staff.permissions), db.select({ id: users.id, name: users.name }).from(users).where(eq(users.isActive, true))]);
  const late = work.filter((w) => w.late).length;
  return (
    <>
      <PageHeader
        title="İş listesi"
        description={`${work.length} bekleyen iş${late ? ` · ${late} gecikmiş` : ""}. Bir işi üstlenmek için sağdaki yuvarlağa tıkla; iş tamamlanınca (durum değişince) listeden kendiliğinden düşer.`}
      />
      <WorkList items={work.map((w) => ({ ...w, at: w.at.toISOString() }))} groups={WORK_GROUPS} me={staff.id} staff={team} />
      <div className="mt-6 rounded-xl border border-line bg-white p-4 text-xs text-mute">
        <b className="text-deep">Hedef süreler:</b> havale bildirimi 4 saat içinde kontrol · ödenmiş sipariş 24 saatte hazırlanır, 36 saatte kargoya verilir · müşteri mesajı 4 saatte yanıtlanır · iade talebi 24 saatte değerlendirilir ·
        kargolanan siparişin faturası 3 gün içinde eklenir · servis kaydı 2 günden fazla aynı durumda beklemez.
      </div>
    </>
  );
}
