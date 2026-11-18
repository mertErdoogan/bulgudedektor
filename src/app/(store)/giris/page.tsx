import { getT, getL } from "@/lib/i18n/server";
import Link from "@/components/locale-link";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Input } from "@/components/ui";
import { getCustomer } from "@/lib/auth";
import { customerLogin } from "../hesabim/actions";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("meta.giris"), robots: { index: false } };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const L = await getL();
  if (await getCustomer()) redirect(next ?? "/hesabim");
  return (
    <div className="container-x max-w-md py-12">
      <h1 className="font-display text-2xl font-extrabold">{L("Giriş yap", "Sign in")}</h1>
      <p className="mt-1 text-sm text-mute">{L("Cihazların, garantin ve servis kayıtların hesabında.", "Your detectors, warranty and service requests in one account.")}</p>
      <ActionForm action={customerLogin} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label={L("E-posta veya cep telefonu", "Email or mobile number")}><Input name="id" autoComplete="username" required className="h-12" /></Field>
        <Field label={L("Şifre", "Password")}><Input name="password" type="password" autoComplete="current-password" required className="h-12" /></Field>
        <SubmitButton size="lg">{L("Giriş yap", "Sign in")}</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-sm">{L("Hesabın yok mu?", "Don't have an account?")} <Link href={`/kayit${next ? `?next=${next}` : ""}`} className="font-bold text-link">{L("Kayıt ol", "Create one")}</Link></p>
      <p className="mt-2 text-sm"><Link href="/sifremi-unuttum" className="font-bold text-link">{L("Şifremi unuttum / şifre oluştur", "Forgot password / set a password")}</Link></p>
    </div>
  );
}
