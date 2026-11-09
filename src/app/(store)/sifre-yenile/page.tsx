import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Input } from "@/components/ui";
import { checkReset } from "@/lib/reset";
import { customerResetPassword } from "../hesabim/actions";

export const metadata = { title: "Yeni şifre", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t = "" } = await searchParams;
  const valid = await checkReset("customer", t);
  return (
    <div className="container-x max-w-md py-12">
      <h1 className="font-display text-2xl font-extrabold">Yeni şifre belirle</h1>
      {valid ? (
        <ActionForm action={customerResetPassword} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="t" value={t} />
          <Field label="Yeni şifre" hint="En az 8 karakter"><Input name="password" type="password" autoComplete="new-password" minLength={8} required className="h-12" /></Field>
          <Field label="Yeni şifre (tekrar)"><Input name="password2" type="password" autoComplete="new-password" required className="h-12" /></Field>
          <SubmitButton size="lg">Şifremi kaydet</SubmitButton>
        </ActionForm>
      ) : (
        <div className="mt-6 rounded-xl bg-warn-bg p-4 text-sm text-warn">
          Bu bağlantının süresi dolmuş veya daha önce kullanılmış. <Link href="/sifremi-unuttum" className="font-bold underline">Yeni bağlantı iste</Link>
        </div>
      )}
    </div>
  );
}
