import { getT, getL } from "@/lib/i18n/server";
import Link from "@/components/locale-link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Turnstile } from "@/components/turnstile";
import { Field, Input } from "@/components/ui";
import { customerForgot } from "../hesabim/actions";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("meta.sifremi_unuttum"), robots: { index: false } };
}

export default async function ForgotPage() {
  const L = await getL();
  return (
    <div className="container-x max-w-md py-12">
      <h1 className="font-display text-2xl font-extrabold">{L("Şifremi unuttum", "Forgot password")}</h1>
      <p className="mt-1 text-sm text-mute">{L("Hesabındaki e-postayı yaz; şifre belirleme bağlantısını gönderelim.", "Enter your account email and we'll send you a link to set a password.")}</p>
      <ActionForm action={customerForgot} className="mt-6 flex flex-col gap-4">
        <Field label={L("E-posta", "Email")}><Input name="email" type="email" autoComplete="email" required className="h-12" /></Field>
        <Turnstile />
        <SubmitButton size="lg">{L("Bağlantı gönder", "Send link")}</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-sm"><Link href="/giris" className="font-bold text-link">← {L("Girişe dön", "Back to sign in")}</Link></p>
    </div>
  );
}
