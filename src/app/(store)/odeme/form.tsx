"use client";

import { imgUrl } from "@/lib/img";
import Link from "@/components/locale-link";
import { useEffect, useRef, useState, useTransition } from "react";
import { emit } from "@/lib/track";
import { CityDistrict } from "@/components/city-district";
import { Building2, CreditCard, Lock, Store, Truck } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { readAttribution } from "@/components/store/attribution";
import { useCart } from "@/components/store/cart";
import { Checkbox, Field, Input, Textarea } from "@/components/ui";
import type { publicSettings } from "@/lib/settings";
import type { Quote } from "@/lib/pricing";
import { cn, formatTL } from "@/lib/utils";
import { getCartQuote } from "../actions";
import { placeOrder } from "./actions";
import { useT } from "@/components/i18n";
import type { DictKey } from "@/lib/i18n/dict";

type PS = ReturnType<typeof publicSettings>;

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line p-5">
      <h2 className="mb-4 flex items-center gap-2.5 text-lg font-extrabold">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-deep text-sm text-white">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Opt({ checked, onClick, icon, title, desc }: { checked: boolean; onClick: () => void; icon: React.ReactNode; title: React.ReactNode; desc?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-3 rounded-xl border-[1.5px] p-3.5 text-left", checked ? "border-brand bg-tint" : "border-line")}>
      <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", checked ? "border-brand" : "border-[#bdbdc2]")}>{checked ? <span className="h-2.5 w-2.5 rounded-full bg-brand" /> : null}</span>
      <span className="flex-1 text-sm"><b>{title}</b>{desc ? <span className="block text-mute">{desc}</span> : null}</span>
      <span className="text-mute">{icon}</span>
    </button>
  );
}

export function CheckoutForm({ settings: s, bankAccounts, me, address }: { settings: PS; bankAccounts: { bank: string; iban: string; holder: string }[]; me: { name: string; email: string; phone: string } | null; address: { city: string; district: string; line: string; zip: string } | null }) {
  const { items, ready, applyFixes } = useCart();
  const t = useT();
  const k = (x: string) => t(`co.${x}` as DictKey);
  const [delivery, setDelivery] = useState<"CARGO" | "PICKUP">("CARGO");
  const [pay, setPay] = useState<"CARD" | "TRANSFER">(s.payment.cardEnabled ? "CARD" : "TRANSFER");
  const [invoice, setInvoice] = useState<"INDIVIDUAL" | "CORPORATE">("INDIVIDUAL");
  const [coupon, setCoupon] = useState<string | null>(null);
  const [attr, setAttr] = useState("");
  const [q, setQ] = useState<Quote | null>(null);
  const [, start] = useTransition();
  useEffect(() => {
    try {
      setCoupon(sessionStorage.getItem("bulgu_coupon"));
      const a = readAttribution();
      if (a) setAttr(JSON.stringify(a));
    } catch {}
  }, []);
  useEffect(() => {
    if (ready) start(async () => setQ(await getCartQuote(items, coupon, pay, delivery)));
  }, [items, coupon, pay, delivery, ready]);
  // Satıştan kalkan / stoğu biten ürünü sepetten bir kez düzelt; yeniden hesaplanan sepette uyarı kalmaz
  const fixedFor = useRef<Quote | null>(null);
  useEffect(() => {
    if (!q?.fixes?.length || fixedFor.current === q) return;
    fixedFor.current = q;
    applyFixes(q.fixes);
  }, [q, applyFixes]);
  const begun = useRef(false);
  useEffect(() => {
    if (!q || begun.current || !items.length) return;
    begun.current = true;
    emit("begin_checkout", { value: q.total, items: q.lines.map((l) => ({ item_id: l.productId, item_name: l.name, price: l.unitPrice, quantity: l.quantity })) });
  }, [q, items.length]);
  /** Terk edilen sepet hatırlatması için: e-posta yazıldığında sepetin son hali kaydedilir. */
  const snapshot = (form: HTMLFormElement | null) => {
    if (!form) return;
    const fd = new FormData(form);
    const email = String(fd.get("email") ?? "");
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    void fetch("/api/sepet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name: fd.get("fullName"), items, consent: fd.get("marketing") === "on" }), keepalive: true }).catch(() => {});
  };

  if (ready && !items.length)
    return (
      <div className="container-x py-16 text-center">
        <p className="font-bold">{k("empty")}</p>
        <Link href="/urunler" className="mt-3 inline-block font-bold text-link">{k("back")} →</Link>
      </div>
    );

  return (
    <ActionForm
      action={placeOrder}
      className="container-x grid gap-6 py-6 pb-32 lg:grid-cols-[minmax(0,1fr)_400px]"
    >
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="coupon" value={coupon ?? ""} />
      <input type="hidden" name="deliveryMethod" value={delivery} />
      <input type="hidden" name="paymentMethod" value={pay} />
      <input type="hidden" name="invoiceType" value={invoice} />
      <input type="hidden" name="attr" value={attr} />
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-extrabold">{t("cart.checkout")}</h1>
          <span className="flex items-center gap-1.5 text-sm font-bold text-link"><Lock size={15} /> {k("secure")}</span>
        </div>
        <Step n={1} title={k("contact")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={k("phone")}><Input name="phone" type="tel" autoComplete="tel" defaultValue={me?.phone ?? ""} placeholder="05xx xxx xx xx" required pattern="\+?[0-9 ]{10,16}" data-error={k("phone_err")} /></Field>
            <Field label={k("email")}><Input name="email" type="email" autoComplete="email" defaultValue={me?.email ?? ""} required onBlur={(e) => snapshot(e.currentTarget.form)} /></Field>
          </div>
          {!me ? (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-bold text-link">{k("create_acc")}</summary>
              <Field label={k("password")} className="mt-2"><Input name="password" type="password" autoComplete="new-password" minLength={8} /></Field>
            </details>
          ) : <p className="mt-2 text-xs text-mute">{t("co.signed_in", { name: me.name })}</p>}
          {!me ? (
            <p className="mt-3 rounded-xl bg-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-mute" data-testid="guest-info">
              <b className="text-deep">{k("guest_b")}</b> {k("guest_1")} <Link href="/siparis-takip" className="font-bold text-link">{k("guest_track")}</Link> {k("guest_2")} <Link href="/giris?next=/odeme" className="font-bold text-link">{k("guest_login")}</Link>.
            </p>
          ) : null}
        </Step>

        <Step n={2} title={k("delivery")}>
          <div className="flex flex-col gap-2">
            <Opt checked={delivery === "CARGO"} onClick={() => setDelivery("CARGO")} icon={<Truck />} title={<>{k("cargo")} {q && q.shippingTotal === 0 ? `· ${k("free")}` : ""}</>} desc={`${k("eta")} ${t.locale === "en" ? s.shipping.deliveryEstimate.replace(/iş günü/i, "business days") : s.shipping.deliveryEstimate}`} />
            {s.shipping.pickupEnabled ? <Opt checked={delivery === "PICKUP"} onClick={() => setDelivery("PICKUP")} icon={<Store />} title={k("pickup")} desc={s.shipping.pickupAddress || s.store.address || k("pickup_sub")} /> : null}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label={k("name")} className="sm:col-span-2"><Input name="fullName" autoComplete="name" defaultValue={me?.name ?? ""} required /></Field>
            {delivery === "CARGO" ? (
              <>
                <CityDistrict city={address?.city} district={address?.district} />
                <Field label={k("address")} className="sm:col-span-2"><Textarea name="line" autoComplete="street-address" defaultValue={address?.line ?? ""} required className="min-h-[70px]" placeholder={k("address_ph")} /></Field>
                <Field label={k("zip")}><Input name="zip" autoComplete="postal-code" defaultValue={address?.zip ?? ""} /></Field>
                <Checkbox name="saveAddress" defaultChecked label={k("save_addr")} className="self-end pb-2" />
              </>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-lg border border-line text-sm font-bold">
            <button type="button" onClick={() => setInvoice("INDIVIDUAL")} className={cn("py-2.5", invoice === "INDIVIDUAL" && "bg-deep text-white")}>{k("inv_ind")}</button>
            <button type="button" onClick={() => setInvoice("CORPORATE")} className={cn("py-2.5", invoice === "CORPORATE" && "bg-deep text-white")}>{k("inv_corp")}</button>
          </div>
          {invoice === "CORPORATE" ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label={k("company")} className="sm:col-span-3"><Input name="companyName" required /></Field>
              <Field label={k("tax_office")}><Input name="taxOffice" required /></Field>
              <Field label={k("tax_no")} className="sm:col-span-2"><Input name="taxNumber" inputMode="numeric" required pattern="[0-9]{10,11}" data-error={k("tax_err")} /></Field>
            </div>
          ) : null}
          <Field label={k("note")} className="mt-3"><Input name="note" placeholder={k("note_ph")} /></Field>
        </Step>

        <Step n={3} title={k("payment")}>
          <div className="flex flex-col gap-2">
            {s.payment.cardEnabled ? <Opt checked={pay === "CARD"} onClick={() => setPay("CARD")} icon={<CreditCard />} title={k("card")} desc={`${s.payment.noInterestInstallments > 1 ? `${t("co.card_inst", { n: s.payment.noInterestInstallments })} · ` : ""}${k("card_sub")}`} /> : null}
            {s.payment.transferEnabled ? <Opt checked={pay === "TRANSFER"} onClick={() => setPay("TRANSFER")} icon={<Building2 />} title={<>{k("transfer")} {s.payment.transferDiscountPct ? `· ${t("co.transfer_disc", { n: s.payment.transferDiscountPct })}` : ""}</>} desc={k("transfer_sub")} /> : null}
          </div>
          {pay === "CARD" ? (
            <Field label={k("tckn")} hint={k("tckn_hint")} className="mt-3">
              <Input name="tckn" inputMode="numeric" maxLength={11} autoComplete="off" placeholder={k("tckn_ph")} pattern="[0-9]{11}" data-error={k("tckn_err")} />
            </Field>
          ) : null}
          {pay === "CARD" ? (
            <p className="mt-3 flex items-center gap-2 rounded-lg bg-soft p-3 text-xs text-mute"><Lock size={14} /> {k("card_note")}</p>
          ) : bankAccounts.length ? (
            <div className="mt-3 rounded-lg bg-soft p-3 text-xs">{bankAccounts.map((b) => <p key={b.iban}><b>{b.bank}</b> · {b.holder} · <span className="font-mono">{b.iban}</span></p>)}</div>
          ) : null}
          <div className="mt-4 flex flex-col gap-2.5">
            <Checkbox name="terms" required label={<>{k("terms_1")} <Link href="/sayfa/on-bilgilendirme-formu" target="_blank" className="font-bold text-link">{k("terms_pre")}</Link> {k("terms_and")} <Link href="/sayfa/mesafeli-satis-sozlesmesi" target="_blank" className="font-bold text-link">{k("terms_dist")}</Link>{k("terms_2")}</>} />
            <Checkbox name="marketing" onChange={(e) => snapshot(e.currentTarget.form)} label={<span className="text-mute">{k("marketing")}</span>} />
            <p className="text-xs text-mute">{k("kvkk_1")} <Link href="/sayfa/kvkk-aydinlatma-metni" target="_blank" className="underline">{k("kvkk_link")}</Link>{k("kvkk_2")}</p>
          </div>
        </Step>
      </div>

      <aside className="flex flex-col gap-3 self-start lg:sticky lg:top-6">
        <div className="rounded-2xl bg-soft p-5">
          <h2 className="mb-3 font-extrabold">{t("cart.title")}</h2>
          <ul className="flex flex-col gap-3">
            {(q?.lines ?? []).map((l) => (
              <li key={l.productId} className="flex items-center gap-3 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {l.imageUrl ? <img src={imgUrl(l.imageUrl, 128)} alt="" className="h-14 w-14 rounded-lg bg-white object-contain p-1" /> : null}
                <span className="flex-1"><b>{l.name}</b><span className="block text-xs text-mute">{t("co.qty", { n: l.quantity })}</span></span>
                <b>{formatTL(l.total)}</b>
              </li>
            ))}
          </ul>
          {(q?.fixes?.length ? [] : q?.errors ?? []).map((e) => <p key={e} className="mt-2 text-sm text-danger">{e}</p>)}
          <dl className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt>{t("cart.subtotal")}</dt><dd>{formatTL(q?.subtotal)}</dd></div>
            {q?.discountTotal ? <div className="flex justify-between text-ok"><dt>{t("cart.discount")}{q.campaign ? ` (${q.campaign.name})` : ""}</dt><dd>−{formatTL(q.discountTotal)}</dd></div> : null}
            <div className="flex justify-between"><dt>{t("cart.shipping")}</dt><dd>{q?.shippingTotal ? formatTL(q.shippingTotal) : t("cart.free")}</dd></div>
            <div className="flex justify-between pt-2 text-lg font-extrabold"><dt>{t("cart.total")}</dt><dd>{formatTL(q?.total)}</dd></div>
          </dl>
          <SubmitButton size="lg" className="mt-4 hidden w-full lg:flex" disabled={!q?.lines.length} pendingText={k("processing")}>
            <Lock size={16} /> {pay === "CARD" ? k("pay") : k("confirm")} · {formatTL(q?.total)}
          </SubmitButton>
        </div>
        <div className="rounded-2xl border border-line p-4 text-xs leading-relaxed text-mute">
          <b className="text-deep">{k("after_b")}</b> {k("after")}
        </div>
      </aside>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
        <SubmitButton size="lg" className="w-full" disabled={!q?.lines.length} pendingText={k("processing")}>
          <Lock size={16} /> {pay === "CARD" ? k("pay") : k("confirm")} · {formatTL(q?.total)}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
