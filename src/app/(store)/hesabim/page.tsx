import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { addresses, orderItems, orders, serialNumbers, serviceRecords } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ActionButton } from "@/components/admin/delete-button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { getCustomer } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { orderKey } from "@/lib/store";
import { ORDER_STATUS_LABEL, RETURN_STATUS_LABEL, SERVICE_STATUS_LABEL, formatDate, formatTL, orderNo, serviceNo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { customerLogout, deleteAddress, requestReturn, requestService, saveAddress, updateProfile } from "./actions";

export const metadata = { title: "Hesabım", robots: { index: false } };

const TABS = [
  ["cihazlar", "Cihazlarım"],
  ["siparisler", "Siparişler"],
  ["servis", "Servis"],
  ["adresler", "Adresler"],
  ["profil", "Bilgilerim"],
];

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ t?: string; iade?: string; ariza?: string }> }) {
  const me = await getCustomer();
  if (!me) redirect("/giris?next=/hesabim");
  const sp = await searchParams;
  const tab = sp.iade ? "siparisler" : sp.ariza ? "servis" : (sp.t ?? "cihazlar");
  const [myOrders, services, addrs, s] = await Promise.all([
    db.query.orders.findMany({ where: eq(orders.customerId, me.id), orderBy: desc(orders.createdAt), with: { items: true, returns: true } }),
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
  const returnOrder = sp.iade ? myOrders.find((o) => o.id === sp.iade) : undefined;
  const openService = services.filter((x) => x.status !== "CLOSED").length;

  return (
    <div className="container-x py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-deep p-5 text-white">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Merhaba, {me.name.split(" ")[0]}</h1>
          <p className="text-sm opacity-75">{devices.length} cihaz · {myOrders.length} sipariş{openService ? ` · ${openService} açık servis kaydı` : ""}</p>
        </div>
        <form action={customerLogout}><button className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold">Çıkış yap</button></form>
      </div>
      <nav className="scrollbar-none mb-5 flex gap-2 overflow-x-auto">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`/hesabim?t=${k}`} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-bold", tab === k ? "bg-deep text-white" : "border border-line")}>{l}</Link>
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
                    {image ? <img src={image} alt="" className="h-20 w-24 object-contain" /> : null}
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
                    <Link href={`/hesabim?ariza=${d.serial}`} className="rounded-lg bg-soft p-2.5">Arıza bildir</Link>
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
          {returnOrder ? (
            <ActionForm action={requestReturn} className="flex flex-col gap-3 rounded-2xl border-2 border-brand p-5">
              <input type="hidden" name="orderId" value={returnOrder.id} />
              <b>İade talebi · {orderNo(returnOrder.number)}</b>
              <Field label="Sebep">
                <Select name="reason" required defaultValue="">
                  <option value="" disabled>Seç</option>
                  <option>Beklentimi karşılamadı</option>
                  <option>Yanlış ürün seçtim</option>
                  <option>Kusurlu / hasarlı geldi</option>
                  <option>Başka yerden daha uygununu buldum</option>
                  <option>Diğer</option>
                </Select>
              </Field>
              <Field label="Açıklama (isteğe bağlı)"><Textarea name="details" /></Field>
              <p className="text-xs text-mute">Ürünü kutusu ve aksesuarlarıyla göndermen gerekir. Onaydan sonra ücretsiz kargo kodu iletilir.</p>
              <SubmitButton className="self-start">Talebi gönder</SubmitButton>
            </ActionForm>
          ) : null}
          {myOrders.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-4 text-sm">
              <div className="flex-1">
                <Link href={`/siparis/${o.id}?k=${orderKey(o.id)}`} className="font-bold text-link">{orderNo(o.number)}</Link>
                <span className="block text-mute">{formatDate(o.createdAt)} · {o.items.map((i) => i.name).join(", ")}</span>
                {o.returns.map((r) => <span key={r.id} className="mt-1 block text-xs font-bold text-warn">İade: {RETURN_STATUS_LABEL[r.status]}{r.returnCode ? ` · kargo kodu ${r.returnCode}` : ""}</span>)}
              </div>
              <span className="rounded-md bg-soft px-2 py-1 text-xs font-bold">{ORDER_STATUS_LABEL[o.status]}</span>
              <b>{formatTL(o.total)}</b>
              {o.status === "DELIVERED" && !o.returns.length ? <Link href={`/hesabim?iade=${o.id}`} className="text-xs font-bold text-link">İade et</Link> : null}
            </div>
          ))}
          {!myOrders.length ? <p className="rounded-xl bg-soft p-6 text-sm text-mute">Henüz siparişin yok.</p> : null}
        </div>
      ) : null}

      {tab === "servis" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex flex-col gap-3">
            {services.map((x) => (
              <div key={x.id} className="rounded-xl border border-line p-4 text-sm">
                <div className="flex justify-between"><b>{serviceNo(x.number)} · {x.productName}</b><span className="rounded-md bg-[#f6efe3] px-2 py-0.5 text-xs font-bold text-[#6b5128]">{SERVICE_STATUS_LABEL[x.status]}</span></div>
                <p className="text-mute">{x.issue}</p>
                <ol className="mt-3 flex flex-col gap-2">
                  {x.history.map((h, i) => <li key={i} className="border-l-2 border-brand pl-3"><b>{SERVICE_STATUS_LABEL[h.status]}</b> <span className="text-xs text-mute">{formatDate(h.at, true)}</span>{h.note ? <p className="text-mute">{h.note}</p> : null}</li>)}
                </ol>
                {x.cost && !x.underWarranty ? <p className="mt-2 font-bold">Ücret: {formatTL(x.cost)}</p> : null}
              </div>
            ))}
            {!services.length ? <p className="rounded-xl bg-soft p-6 text-sm text-mute">Servis kaydın yok.</p> : null}
          </div>
          <ActionForm action={requestService} className="flex flex-col gap-3 self-start rounded-2xl border border-line p-5">
            <b>Arıza bildir</b>
            <Field label="Cihaz">
              <Select name="productName" required defaultValue={devices.find((d) => d.s.serial === sp.ariza)?.name ?? ""}>
                <option value="" disabled>Seç</option>
                {devices.map((d) => <option key={d.s.id} value={d.name}>{d.name} ({d.s.serial})</option>)}
                <option value="Diğer">Listede yok</option>
              </Select>
            </Field>
            <Field label="Seri no"><Input name="serial" defaultValue={sp.ariza ?? ""} /></Field>
            <Field label="Ne oluyor?"><Textarea name="issue" required placeholder="Örn. açılıyor ama ses gelmiyor, ekranda hata kodu var…" /></Field>
            <p className="text-xs text-mute">Kısa bir video çekip WhatsApp&apos;tan gönderirsen teknisyen önceden bakar; çoğu sorun cihaz gelmeden çözülür.</p>
            <SubmitButton>Kaydı aç</SubmitButton>
          </ActionForm>
        </div>
      ) : null}

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
            <div className="grid grid-cols-2 gap-2"><Input name="city" placeholder="İl" required /><Input name="district" placeholder="İlçe" required /></div>
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
          <p className="text-xs text-mute sm:col-span-2">Hesabının silinmesini istiyorsan {s.store.email || "bize"} adresine yaz; KVKK kapsamında 30 gün içinde işleme alınır.</p>
        </ActionForm>
      ) : null}
    </div>
  );
}
