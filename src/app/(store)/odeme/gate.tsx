"use client";

import Link from "next/link";
import { ArrowRight, Lock, Mail, PackageSearch, UserPlus } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Input } from "@/components/ui";
import { useCart } from "@/components/store/cart";
import { customerLogin } from "../hesabim/actions";

/**
 * Ödemeye geçmeden önce, giriş yapmamış müşteriye iki net seçenek: giriş yap ya da üye olmadan devam et.
 * Kalabalık yok: solda kısa giriş formu, sağda misafir alışverişinin nasıl ilerlediğini anlatan üç satır.
 */
export function CheckoutGate() {
  const { items, ready } = useCart();
  const count = items.reduce((a, i) => a + i.quantity, 0);

  if (ready && !items.length)
    return (
      <div className="container-x py-16 text-center">
        <p className="font-bold">Sepetin boş.</p>
        <Link href="/urunler" className="mt-3 inline-block font-bold text-link">Ürünlere dön →</Link>
      </div>
    );

  return (
    <div className="container-x max-w-[960px] py-8 md:py-12" data-testid="checkout-gate">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-[26px] font-extrabold tracking-tight md:text-[32px]">Nasıl devam etmek istersin?</h1>
          <p className="mt-1 text-[14px] text-mute">{count ? `Sepetinde ${count} ürün var. ` : ""}Üyelik zorunlu değil.</p>
        </div>
        <span className="flex items-center gap-1.5 text-sm font-bold text-link"><Lock size={15} /> Güvenli ödeme</span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {/* Misafir: en kısa yol, bu yüzden önce (telefonda üstte) */}
        <section className="order-1 flex flex-col rounded-[24px] bg-deep p-6 text-white md:order-2">
          <h2 className="text-[19px] font-extrabold">Üye olmadan devam et</h2>
          <p className="mt-1 text-[13.5px] text-white/70">Sadece teslimat ve iletişim bilgilerin yeterli.</p>
          <ul className="mt-5 flex flex-col gap-3.5 text-[13.5px]">
            <li className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10"><Mail size={15} /></span><span><b>Onay e-postası ve SMS</b><span className="block text-white/65">Sipariş numaran ve özetin hemen gelir.</span></span></li>
            <li className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10"><PackageSearch size={15} /></span><span><b>Kargonu takip et</b><span className="block text-white/65">Sipariş takibi sayfasında sipariş no + e-posta ile.</span></span></li>
            <li className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10"><UserPlus size={15} /></span><span><b>İstersen sonra üye ol</b><span className="block text-white/65">Aynı e-postayla hesap açınca siparişin ve garantin hesabında görünür.</span></span></li>
          </ul>
          <Link
            href="/odeme?misafir=1"
            onClick={() => window.dispatchEvent(new Event("arena-nav-start"))}
            className="mt-6 flex h-13 min-h-[52px] items-center justify-center gap-2 rounded-full bg-white text-[15px] font-extrabold text-deep transition hover:-translate-y-0.5"
            data-testid="guest-continue"
          >
            Üye olmadan devam et <ArrowRight size={17} />
          </Link>
        </section>

        <section className="order-2 rounded-[24px] border border-line bg-white p-6 md:order-1">
          <h2 className="text-[19px] font-extrabold">Giriş yap</h2>
          <p className="mt-1 text-[13.5px] text-mute">Adresin ve bilgilerin hazır gelir, siparişin hesabında durur.</p>
          <ActionForm action={customerLogin} className="mt-5 flex flex-col gap-3.5">
            <input type="hidden" name="next" value="/odeme" />
            <Field label="E-posta veya cep telefonu"><Input name="id" autoComplete="username" required className="h-12" /></Field>
            <Field label="Şifre"><Input name="password" type="password" autoComplete="current-password" required className="h-12" /></Field>
            <SubmitButton size="lg" className="rounded-full">Giriş yap ve devam et</SubmitButton>
          </ActionForm>
          <div className="mt-4 flex flex-wrap justify-between gap-2 text-[13px]">
            <Link href="/sifremi-unuttum" className="font-semibold text-mute hover:text-deep">Şifremi unuttum</Link>
            <Link href="/kayit?next=/odeme" className="font-bold text-link">Hesap oluştur →</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
