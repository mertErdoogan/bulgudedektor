import { getL } from "@/lib/i18n/server";
import { allowIp } from "@/lib/guard";
import { pageMeta } from "@/lib/seo";
import Link from "@/components/locale-link";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { serviceRecords } from "@/db/schema";
import { SERVICE_STATUS_LABEL, formatDate, normalizePhone, serviceNo } from "@/lib/utils";

export async function generateMetadata() {
  const L = await getL();
  return pageMeta({ title: L("Dedektör Teknik Servis ve Kayıt Sorgulama", "Metal Detector Service and Repair Status"), description: L("Servis kaydınızın durumunu sorgulayın. Arızalı cihazlar için ücretsiz kargo kodu ve aşama aşama takip.", "Check the status of your service request. Free shipping code for faulty detectors and step-by-step tracking."), path: "/servis" });
}

export default async function ServicePublic({ searchParams }: { searchParams: Promise<{ no?: string; iletisim?: string }> }) {
  const sp = await searchParams;
  const L = await getL();
  const num = Number((sp.no ?? "").replace(/\D/g, ""));
  const c = (sp.iletisim ?? "").trim().toLowerCase();
  const limited = !!(num && c) && !(await allowIp("service", 15, 15 * 60 * 1000));
  const r = num && c && !limited ? await db.query.serviceRecords.findFirst({ where: and(eq(serviceRecords.number, num), or(eq(serviceRecords.contact, c), eq(serviceRecords.contact, normalizePhone(c)))) }) : null;
  return (
    <div className="container-x max-w-xl py-12">
      <h1 className="font-display text-2xl font-extrabold">{L("Servis kaydı", "Service request")}</h1>
      <p className="mt-1 text-sm text-mute">{L("Yeni arıza kaydı için", "To report a new fault, contact us from")} <Link href="/hesabim?t=servis" className="font-bold text-link">{L("hesabından", "your account")}</Link> {L("veya WhatsApp'tan bize ulaş. Mevcut kaydını aşağıdan sorgula.", "or on WhatsApp. Check an existing request below.")}</p>
      <form className="mt-5 flex flex-col gap-2">
        <input name="no" defaultValue={sp.no} required placeholder={L("Servis no (SRV-00012)", "Service no. (SRV-00012)")} className="h-12 rounded-lg border border-[#d6d6d9] px-4" />
        <input name="iletisim" defaultValue={sp.iletisim} required placeholder={L("Kayıttaki telefon veya e-posta", "Phone or email on the request")} className="h-12 rounded-lg border border-[#d6d6d9] px-4" />
        <button className="h-12 rounded-lg bg-brand font-extrabold text-white">{L("Sorgula", "Check")}</button>
      </form>
      {limited ? <p className="mt-4 font-semibold text-danger">{L("Çok fazla sorgu yapıldı. 15 dakika sonra tekrar dene.", "Too many checks. Please try again in 15 minutes.")}</p> : sp.no && !r ? <p className="mt-4 font-semibold text-danger">{L("Kayıt bulunamadı.", "No record found.")}</p> : null}
      {r ? (
        <div className="mt-6 rounded-2xl border border-line p-5 text-sm">
          <b className="text-base">{serviceNo(r.number)} · {r.productName}</b>
          <p className="text-mute">{r.issue}</p>
          <ol className="mt-4 flex flex-col gap-2">{r.history.map((h, i) => <li key={i} className="border-l-2 border-brand pl-3"><b>{SERVICE_STATUS_LABEL[h.status]}</b> <span className="text-xs text-mute">{formatDate(h.at, true, L.locale)}</span>{h.note ? <p className="text-mute">{h.note}</p> : null}</li>)}</ol>
        </div>
      ) : null}
    </div>
  );
}
