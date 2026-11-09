import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Turnstile } from "@/components/turnstile";
import { Field, Input } from "@/components/ui";
import { customerForgot } from "../hesabim/actions";

export const metadata = { title: "Şifremi unuttum", robots: { index: false } };

export default function ForgotPage() {
  return (
    <div className="container-x max-w-md py-12">
      <h1 className="font-display text-2xl font-extrabold">Şifremi unuttum</h1>
      <p className="mt-1 text-sm text-mute">Hesabındaki e-postayı yaz; şifre belirleme bağlantısını gönderelim. Eski sitemizden gelen üyeler de buradan yeni şifre oluşturabilir.</p>
      <ActionForm action={customerForgot} className="mt-6 flex flex-col gap-4">
        <Field label="E-posta"><Input name="email" type="email" autoComplete="email" required className="h-12" /></Field>
        <Turnstile />
        <SubmitButton size="lg">Bağlantı gönder</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-sm"><Link href="/giris" className="font-bold text-link">← Girişe dön</Link></p>
    </div>
  );
}
