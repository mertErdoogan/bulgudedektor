"use client";

import Link from "@/components/locale-link";
import { ArrowRight, Lock, Mail, PackageSearch, UserPlus } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Input } from "@/components/ui";
import { useCart } from "@/components/store/cart";
import { customerLogin } from "../hesabim/actions";
import { useT } from "@/components/i18n";

/**
 * Ödemeye geçmeden önce, giriş yapmamış müşteriye iki net seçenek: giriş yap ya da üye olmadan devam et.
 * Kalabalık yok: solda kısa giriş formu, sağda misafir alışverişinin nasıl ilerlediğini anlatan üç satır.
 */
export function CheckoutGate() {
  const { items, ready } = useCart();
  const count = items.reduce((a, i) => a + i.quantity, 0);
  const t = useT();

  if (ready && !items.length)
    return (
      <div className="container-x py-16 text-center">
        <p className="font-bold">{t("checkout.empty")}</p>
        <Link href="/urunler" className="mt-3 inline-block font-bold text-link">{t("checkout.backToProducts")}</Link>
      </div>
    );

  return (
    <div className="container-x max-w-[960px] py-8 md:py-12" data-testid="checkout-gate">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-[26px] font-extrabold tracking-tight md:text-[32px]">{t("checkout.gateTitle")}</h1>
          <p className="mt-1 text-[14px] text-mute">{count ? `${t("checkout.gateItems", { n: count })} ` : ""}{t("checkout.gateNoAccount")}</p>
        </div>
        <span className="flex items-center gap-1.5 text-sm font-bold text-link"><Lock size={15} /> {t("checkout.secure")}</span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {/* Misafir: en kısa yol, bu yüzden önce (telefonda üstte) */}
        <section className="order-1 flex flex-col rounded-[24px] bg-deep p-6 text-white md:order-2">
          <h2 className="text-[19px] font-extrabold">{t("checkout.guestTitle")}</h2>
          <p className="mt-1 text-[13.5px] text-white/70">{t("checkout.guestSub")}</p>
          <ul className="mt-5 flex flex-col gap-3.5 text-[13.5px]">
            <li className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10"><Mail size={15} /></span><span><b>{t("checkout.guest1")}</b><span className="block text-white/65">{t("checkout.guest1d")}</span></span></li>
            <li className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10"><PackageSearch size={15} /></span><span><b>{t("checkout.guest2")}</b><span className="block text-white/65">{t("checkout.guest2d")}</span></span></li>
            <li className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10"><UserPlus size={15} /></span><span><b>{t("checkout.guest3")}</b><span className="block text-white/65">{t("checkout.guest3d")}</span></span></li>
          </ul>
          <Link
            href="/odeme?misafir=1"
            onClick={() => window.dispatchEvent(new Event("site-nav-start"))}
            className="mt-6 flex h-13 min-h-[52px] items-center justify-center gap-2 rounded-full bg-white text-[15px] font-extrabold text-deep transition hover:-translate-y-0.5"
            data-testid="guest-continue"
          >
            {t("checkout.guestCta")} <ArrowRight size={17} />
          </Link>
        </section>

        <section className="order-2 rounded-[24px] border border-line bg-white p-6 md:order-1">
          <h2 className="text-[19px] font-extrabold">{t("checkout.loginTitle")}</h2>
          <p className="mt-1 text-[13.5px] text-mute">{t("checkout.loginSub")}</p>
          <ActionForm action={customerLogin} className="mt-5 flex flex-col gap-3.5">
            <input type="hidden" name="next" value="/odeme" />
            <Field label={t("checkout.loginId")}><Input name="id" autoComplete="username" required className="h-12" /></Field>
            <Field label={t("checkout.password")}><Input name="password" type="password" autoComplete="current-password" required className="h-12" /></Field>
            <SubmitButton size="lg" className="rounded-full">{t("checkout.loginCta")}</SubmitButton>
          </ActionForm>
          <div className="mt-3 text-[13px]">
            <Link href="/sifremi-unuttum" className="font-semibold text-mute hover:text-deep">{t("checkout.forgot")}</Link>
          </div>
          {/* Üyeliği olmayan için göze çarpan kayıt çağrısı */}
          <Link
            href="/kayit?next=/odeme"
            className="group relative mt-5 flex items-center gap-3 overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#fdecea,#fff6ef)] p-4 ring-1 ring-[#f6d3cd] transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-22px_color-mix(in_srgb,var(--color-brand)_80%,transparent)]"
            data-testid="gate-signup"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-[0_8px_16px_-8px_color-mix(in_srgb,var(--color-brand)_90%,transparent)] transition group-hover:-rotate-6"><UserPlus size={20} /></span>
            <span className="min-w-0 flex-1">
              <b className="block text-[15px] text-deep">{t("checkout.noAccount")}</b>
              <span className="block text-[12.5px] leading-snug text-[#6b2a22]">{t("checkout.noAccountD")}</span>
            </span>
            <span className="shrink-0 rounded-full bg-deep px-3.5 py-2 text-[13px] font-extrabold text-white">{t("checkout.signUpNow")}</span>
          </Link>
        </section>
      </div>
    </div>
  );
}
