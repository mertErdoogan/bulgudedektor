import { getT, getL } from "@/lib/i18n/server";
import Link from "@/components/locale-link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Turnstile } from "@/components/turnstile";
import { Checkbox, Field, Input } from "@/components/ui";
import { customerRegister } from "../hesabim/actions";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("meta.kayit"), robots: { index: false } };
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const sp = await searchParams;
  const L = await getL();
  return (
    <div className="container-x max-w-md py-12">
      <h1 className="font-display text-2xl font-extrabold">{L("Kayıt ol", "Create an account")}</h1>
      <p className="mt-1 text-sm text-mute">{L("Daha önce misafir olarak sipariş verdiysen aynı e-posta ile kayıt ol; siparişlerin hesabına bağlanır.", "If you've ordered as a guest before, sign up with the same email and your orders will be linked to your account.")}</p>
      <ActionForm action={customerRegister} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="next" value={sp.next ?? ""} />
        <Field label={L("Ad soyad", "Full name")}><Input name="name" autoComplete="name" required className="h-12" /></Field>
        <Field label={L("E-posta", "Email")}><Input name="email" type="email" autoComplete="email" required className="h-12" defaultValue={sp.email ?? ""} /></Field>
        <Field label={L("Cep telefonu", "Mobile phone")}><Input name="phone" type="tel" autoComplete="tel" required className="h-12" placeholder="05xx xxx xx xx" /></Field>
        <Field label={L("Şifre (en az 8 karakter)", "Password (at least 8 characters)")}><Input name="password" type="password" autoComplete="new-password" required minLength={8} className="h-12" /></Field>
        <Checkbox name="kvkk" required label={<>{L("", "I accept the ")}<Link href="/sayfa/uyelik-sozlesmesi" target="_blank" className="font-bold text-link">{L("Üyelik sözleşmesini", "membership agreement")}</Link>{L(" kabul ediyorum, ", " and have read the ")}<Link href="/sayfa/kvkk-aydinlatma-metni" target="_blank" className="font-bold text-link">{L("aydınlatma metnini", "privacy notice")}</Link>{L(" okudum.", ".")}</>} />
        <Checkbox name="marketing" label={<span className="text-mute">{L("Kampanya ve kullanım ipuçları için SMS / e-posta almak istiyorum (isteğe bağlı).", "Send me offers and usage tips by SMS / email (optional).")}</span>} />
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        <Turnstile />
        <SubmitButton size="lg">{L("Hesabımı oluştur", "Create my account")}</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-sm">{L("Zaten hesabın var mı?", "Already have an account?")} <Link href="/giris" className="font-bold text-link">{L("Giriş yap", "Sign in")}</Link></p>
    </div>
  );
}
