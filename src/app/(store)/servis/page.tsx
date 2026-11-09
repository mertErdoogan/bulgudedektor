import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { serviceRecords } from "@/db/schema";
import { SERVICE_STATUS_LABEL, formatDate, normalizePhone, serviceNo } from "@/lib/utils";

export const metadata = pageMeta({ title: "Dedektör Teknik Servis ve Kayıt Sorgulama", description: "Servis kaydınızın durumunu sorgulayın. Arızalı cihazlar için ücretsiz kargo kodu ve aşama aşama takip.", path: "/servis" });

export default async function ServicePublic({ searchParams }: { searchParams: Promise<{ no?: string; iletisim?: string }> }) {
  const sp = await searchParams;
  const num = Number((sp.no ?? "").replace(/\D/g, ""));
  const c = (sp.iletisim ?? "").trim().toLowerCase();
  const r = num && c ? await db.query.serviceRecords.findFirst({ where: and(eq(serviceRecords.number, num), or(eq(serviceRecords.contact, c), eq(serviceRecords.contact, normalizePhone(c)))) }) : null;
  return (
    <div className="container-x max-w-xl py-12">
      <h1 className="font-display text-2xl font-extrabold">Servis kaydı</h1>
      <p className="mt-1 text-sm text-mute">Yeni arıza kaydı için <Link href="/hesabim?t=servis" className="font-bold text-link">hesabından</Link> veya WhatsApp&apos;tan bize ulaş. Mevcut kaydını aşağıdan sorgula.</p>
      <form className="mt-5 flex flex-col gap-2">
        <input name="no" defaultValue={sp.no} required placeholder="Servis no (SRV-00012)" className="h-12 rounded-lg border border-[#cfd6cc] px-4" />
        <input name="iletisim" defaultValue={sp.iletisim} required placeholder="Kayıttaki telefon veya e-posta" className="h-12 rounded-lg border border-[#cfd6cc] px-4" />
        <button className="h-12 rounded-lg bg-brand font-extrabold text-white">Sorgula</button>
      </form>
      {sp.no && !r ? <p className="mt-4 font-semibold text-danger">Kayıt bulunamadı.</p> : null}
      {r ? (
        <div className="mt-6 rounded-2xl border border-line p-5 text-sm">
          <b className="text-base">{serviceNo(r.number)} · {r.productName}</b>
          <p className="text-mute">{r.issue}</p>
          <ol className="mt-4 flex flex-col gap-2">{r.history.map((h, i) => <li key={i} className="border-l-2 border-brand pl-3"><b>{SERVICE_STATUS_LABEL[h.status]}</b> <span className="text-xs text-mute">{formatDate(h.at, true)}</span>{h.note ? <p className="text-mute">{h.note}</p> : null}</li>)}</ol>
        </div>
      ) : null}
    </div>
  );
}
