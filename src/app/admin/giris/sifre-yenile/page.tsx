import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Logo } from "@/components/logo";
import { Field, Input } from "@/components/ui";
import { checkReset } from "@/lib/reset";
import { staffResetPassword } from "../actions";

export const metadata = { title: "Yeni şifre" };

export default async function StaffReset({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t = "" } = await searchParams;
  const valid = await checkReset("staff", t);
  return (
    <main className="grid min-h-screen place-items-center bg-soft px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo size={34} /></div>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <h1 className="text-lg font-extrabold">Yeni şifre</h1>
          {valid ? (
            <ActionForm action={staffResetPassword} className="mt-5 flex flex-col gap-4">
              <input type="hidden" name="t" value={t} />
              <Field label="Yeni şifre" hint="En az 10 karakter"><Input name="password" type="password" autoComplete="new-password" minLength={10} required /></Field>
              <Field label="Yeni şifre (tekrar)"><Input name="password2" type="password" autoComplete="new-password" required /></Field>
              <SubmitButton size="lg">Kaydet</SubmitButton>
            </ActionForm>
          ) : (
            <p className="mt-4 rounded-lg bg-warn-bg p-3 text-sm text-warn">Bağlantının süresi dolmuş veya kullanılmış. <Link href="/admin/giris/sifremi-unuttum" className="font-bold underline">Yeni bağlantı iste</Link></p>
          )}
        </div>
      </div>
    </main>
  );
}
