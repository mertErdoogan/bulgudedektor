import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Turnstile } from "@/components/turnstile";
import { Checkbox, Field, Input } from "@/components/ui";
import { customerRegister } from "../hesabim/actions";

export const metadata = { title: "Kayıt ol", robots: { index: false } };

export default function RegisterPage() {
  return (
    <div className="container-x max-w-md py-12">
      <h1 className="font-display text-2xl font-extrabold">Kayıt ol</h1>
      <p className="mt-1 text-sm text-mute">Daha önce misafir olarak sipariş verdiysen aynı e-posta ile kayıt ol; siparişlerin hesabına bağlanır.</p>
      <ActionForm action={customerRegister} className="mt-6 flex flex-col gap-4">
        <Field label="Ad soyad"><Input name="name" autoComplete="name" required className="h-12" /></Field>
        <Field label="E-posta"><Input name="email" type="email" autoComplete="email" required className="h-12" /></Field>
        <Field label="Cep telefonu"><Input name="phone" type="tel" autoComplete="tel" required className="h-12" placeholder="05xx xxx xx xx" /></Field>
        <Field label="Şifre (en az 8 karakter)"><Input name="password" type="password" autoComplete="new-password" required minLength={8} className="h-12" /></Field>
        <Checkbox name="kvkk" required label={<><Link href="/sayfa/kvkk-aydinlatma-metni" target="_blank" className="font-bold text-link">Aydınlatma metnini</Link> okudum.</>} />
        <Checkbox name="marketing" label={<span className="text-mute">Kampanya ve kullanım ipuçları için SMS / e-posta almak istiyorum (isteğe bağlı).</span>} />
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        <Turnstile />
        <SubmitButton size="lg">Hesabımı oluştur</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-sm">Zaten hesabın var mı? <Link href="/giris" className="font-bold text-link">Giriş yap</Link></p>
    </div>
  );
}
