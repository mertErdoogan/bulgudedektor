import { imgUrl } from "@/lib/img";
import { CityDistrict } from "@/components/city-district";
import Link from "@/components/locale-link";
import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { Download, MailWarning, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { addresses, orderItems, orders, serialNumbers, serviceRecords } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ActionButton } from "@/components/admin/delete-button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui";
import { getCustomer } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { describeReturn, hasReturnableUnit, unitGroups } from "@/lib/returns";
import { orderKey } from "@/lib/store";
import { ORDER_STATUS_LABEL, RETURN_STATUS_LABEL, formatDate, formatTL, orderNo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ServiceTab } from "./service-tab";
import { customerLogout, deleteAddress, deleteMyAccount, resendVerification, saveAddress, updateProfile } from "./actions";

export const metadata = { title: "Hesabım", robots: { index: false } };

const TABS = [
  ["cihazlar", "Cihazlarım"],
  ["siparisler", "Siparişler"],
  ["servis", "Servis"],
  ["adresler", "Adresler"],
  ["profil", "Bilgilerim"],
];

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ t?: string; iade?: string; ariza?: string; yeni?: string }> }) {
  const me = await getCustomer();
  if (!me) redirect("/giris?next=/hesabim");
  const sp = await searchParams;
  const tab = sp.iade ? "siparisler" : sp.ariza !== undefined ? "servis" : (sp.t ?? "cihazlar");
  const [myOrders, services, addrs, settings] = await Promise.all([
    db.query.orders.findMany({ where: eq(orders.customerId, me.id), orderBy: desc(orders.createdAt), with: { items: { with: { serials: true } }, returns: true } }),
    db.select().from(serviceRecords).where(eq(serviceRecords.customerId, me.id)).orderBy(desc(serviceRecords.createdAt)),
    db.select().from(addresses).where(eq(addresses.customerId, me.id)),
    getSettings(),
  ]);
  const itemIds = myOrders.flatMap((o) => o.items.map((i) => i.id));
  const devices = itemIds.length
    ? await db
        .select({ s: serialNumbers, name: orderItems.name, image: orderItems.imageUrl, orderId: orderItems.orderId })
        .from(serialNumbers)
        .innerJoin(orderItems, eq(orderItems.id, serialNumbers.orderItemId))
        .where(inArray(serialNumbers.orderItemId, itemIds))
    : [];
  // İade formu artık sipariş detayında: eski bağlantılar oraya gider
  const returnOrder = sp.iade ? myOrders.find((o) => o.id === sp.iade) : undefined;
  if (returnOrder) redirect(`/siparis/${returnOrder.id}?k=${orderKey(returnOrder.id)}&iade=1#iade`);
  const openService = services.filter((x) => x.status !== "CLOSED").length;

  return (
    <div className="container-x py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-deep p-5 text-white">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Merhaba, {me.name.split(" ")[0]}</h1>
          <p className="text-sm opacity-75">{devices.length} cihaz · {myOrders.length} sipariş</p>
        </div>
        <form action={customerLogout}><button className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold">Çıkış yap</button></form>
      </div>
      {me.email && !me.emailVerifiedAt ? (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-warn/30 bg-warn-bg p-4 text-sm">
          <MailWarning size={20} className="shrink-0 text-warn" />
          <p className="flex-1">
            <b>E-posta adresini doğrula.</b> <span className="text-mute">{me.email} adresine gönderdiğimiz bağlantıya tıkla; sipariş ve garanti bildirimleri bu adrese gelir.</span>
          </p>
          <ActionButton run={resendVerification} variant="outline" size="sm">
            Tekrar gönder
          </ActionButton>
        </div>
      ) : null}
      <nav className="scrollbar-none mb-5 flex gap-2 overflow-x-auto" data-testid="account-tabs">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`/hesabim?t=${k}`} className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold", tab === k ? "bg-deep text-white" : "border border-line")}>
            {l}
            {k === "servis" && openService ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] text-white">{openService}</span> : null}
          </Link>
        ))}
      </nav>

      {tab === "cihazlar" ? (
        devices.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {devices.map(({ s: d, name, image, orderId }) => {
              const total = 24 * 30;
              const left = d.warrantyUntil ? Math.max(0, Math.ceil((d.warrantyUntil.getTime() - Date.now()) / 86400000)) : 0;
              return (
                <article key={d.id} className="rounded-2xl border border-line p-4">
                  <div className="flex gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {image ? <img src={imgUrl(image, 256)} alt="" className="h-20 w-24 object-contain" /> : null}
                    <div className="text-sm">
                      <b className="text-base">{name}</b>
                      <p className="text-mute">Seri no <span className="font-mono">{d.serial}</span></p>
                      <p className="flex items-center gap-1 font-bold text-link"><ShieldCheck size={15} /> Orijinal, doğrulandı</p>
                    </div>
                  </div>
                  <div className="mt-3 text-sm">
                    <div className="flex justify-between"><span>Garanti: <b>{left > 0 ? `${Math.ceil(left / 30)} ay kaldı` : "Sona erdi"}</b></span><span className="text-mute">bitiş {formatDate(d.warrantyUntil)}</span></div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-line"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (left / total) * 100)}%` }} /></div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                    {services.some((x) => x.status !== "CLOSED" && x.serial === d.serial) ? (
                      <Link href="/hesabim?t=servis" className="rounded-lg bg-warn-bg p-2.5 text-warn">Serviste · durum</Link>
                    ) : (
                      <Link href={`/hesabim?ariza=${d.serial}#ariza`} className="rounded-lg bg-soft p-2.5">Arıza bildir</Link>
                    )}
                    <Link href={`/siparis/${orderId}?k=${orderKey(orderId)}`} className="rounded-lg bg-soft p-2.5">Sipariş / fatura</Link>
                    <Link href="/kategori/baslik-ve-aksesuar" className="rounded-lg bg-soft p-2.5">Aksesuarlar</Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl bg-soft p-6 text-sm text-mute">Seri numaralı cihazın burada görünür; siparişin kargoya verildiğinde eklenir.</p>
        )
      ) : null}

      {tab === "siparisler" ? (
        <div className="flex flex-col gap-3">
          {myOrders.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-4 text-sm">
              <div className="flex-1">
                <Link href={`/siparis/${o.id}?k=${orderKey(o.id)}`} className="font-bold text-link">{orderNo(o.number)}</Link>
                <span className="block text-mute">{formatDate(o.createdAt)} · {o.items.map((i) => i.name).join(", ")}</span>
                {o.returns.map((r) => <span key={r.id} className="mt-1 block text-xs font-bold text-warn">İade: {RETURN_STATUS_LABEL[r.status]} · {describeReturn(r.items)}{r.returnCode ? ` · kargo kodu ${r.returnCode}` : ""}</span>)}
              </div>
              <span className="rounded-md bg-soft px-2 py-1 text-xs font-bold">{ORDER_STATUS_LABEL[o.status]}</span>
              <b>{formatTL(o.total)}</b>
              {o.status === "DELIVERED" && o.deliveredAt && Date.now() - o.deliveredAt.getTime() < 14 * 86400000 && hasReturnableUnit(unitGroups(o.items, o.returns)) ? <Link href={`/siparis/${o.id}?k=${orderKey(o.id)}&iade=1#iade`} className="text-xs font-bold text-link">İade et</Link> : null}
            </div>
          ))}
          {!myOrders.length ? <p className="rounded-xl bg-soft p-6 text-sm text-mute">Henüz siparişin yok.</p> : null}
        </div>
      ) : null}

      {tab === "servis" ? <ServiceTab services={services} devices={devices} ariza={sp.ariza} created={sp.yeni} whatsapp={settings.store.whatsapp || null} /> : null}

      {tab === "adresler" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex flex-col gap-3">
            {addrs.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-line p-4 text-sm">
                <p><b>{a.title}</b><br />{a.fullName} · {a.phone}<br />{a.line}, {a.district}/{a.city}</p>
                <ActionButton variant="danger-ghost" size="sm" run={deleteAddress.bind(null, a.id)} confirmText="Adres silinsin mi?">Sil</ActionButton>
              </div>
            ))}
            {!addrs.length ? <p className="rounded-xl bg-soft p-6 text-sm text-mute">Kayıtlı adres yok.</p> : null}
          </div>
          <ActionForm action={saveAddress} resetOnSuccess className="flex flex-col gap-3 self-start rounded-2xl border border-line p-5">
            <b>Yeni adres</b>
            <Input name="title" placeholder="Adres adı (Ev, İş)" />
            <Input name="fullName" placeholder="Ad soyad" defaultValue={me.name} required />
            <Input name="phone" placeholder="Telefon" defaultValue={me.phone ?? ""} required />
            <div className="grid grid-cols-2 gap-2"><CityDistrict labels={false} /></div>
            <Textarea name="line" placeholder="Adres" required className="min-h-[70px]" />
            <SubmitButton>Kaydet</SubmitButton>
          </ActionForm>
        </div>
      ) : null}

      {tab === "profil" ? (
        <ActionForm action={updateProfile} className="grid max-w-2xl gap-4 rounded-2xl border border-line p-5 sm:grid-cols-2">
          <Field label="Ad soyad" className="sm:col-span-2"><Input name="name" defaultValue={me.name} required /></Field>
          <Field label="E-posta"><Input name="email" type="email" defaultValue={me.email ?? ""} required /></Field>
          <Field label="Telefon"><Input name="phone" defaultValue={me.phone ?? ""} /></Field>
          <Field label="Mevcut şifre"><Input name="currentPassword" type="password" autoComplete="current-password" /></Field>
          <Field label="Yeni şifre"><Input name="newPassword" type="password" autoComplete="new-password" /></Field>
          <Checkbox name="marketing" defaultChecked={me.marketingConsent} label="Kampanya ve kullanım ipuçları için SMS / e-posta almak istiyorum" className="sm:col-span-2" />
          <SubmitButton className="sm:justify-self-start">Kaydet</SubmitButton>
        </ActionForm>
      ) : null}
      {tab === "profil" ? (
        <div className="mt-5 grid max-w-2xl gap-4">
          <div className="rounded-2xl border border-line p-5 text-sm">
            <b>Verilerim</b>
            <p className="mt-1 text-mute">KVKK kapsamında hesabına ait tüm kişisel verilerin (sipariş, adres, servis, yorum, izinler) dökümünü indirebilirsin.</p>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- dosya indirme, sayfa değil */}
            <a href="/api/hesap/verilerim" download className="mt-3 inline-flex items-center gap-2 rounded-lg border border-deep px-4 py-2 font-bold">
              <Download size={16} /> Verilerimi indir (JSON)
            </a>
          </div>
          <details className="rounded-2xl border border-line p-5 text-sm">
            <summary className="cursor-pointer font-bold text-danger">Hesabımı sil</summary>
            <p className="mt-2 text-mute">
              Ad, e-posta, telefon, adres ve favorilerin silinir; kampanya izinlerin kaldırılır. Fatura ve sipariş kayıtları vergi mevzuatı gereği 10 yıl anonim olarak saklanır. Bu işlem geri alınamaz; garanti sorgusu
              için seri numaranı not almanı öneririz.
            </p>
            <ActionForm action={deleteMyAccount} className="mt-3 grid gap-3 sm:grid-cols-2">
              {me.passwordHash ? (
                <Field label="Şifren">
                  <Input name="password" type="password" autoComplete="current-password" required />
                </Field>
              ) : null}
              <Field label='Onay için "SİL" yaz'>
                <Input name="confirm" required autoComplete="off" />
              </Field>
              <SubmitButton variant="danger" className="sm:col-span-2 sm:justify-self-start">
                Hesabımı kalıcı olarak sil
              </SubmitButton>
            </ActionForm>
          </details>
        </div>
      ) : null}
    </div>
  );
}
