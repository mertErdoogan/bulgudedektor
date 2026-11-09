import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Logo } from "@/components/logo";
import { Field, Input } from "@/components/ui";
import { staffForgot } from "../actions";

export const metadata = { title: "Şifremi unuttum" };

export default function StaffForgot() {
  return (
    <main className="grid min-h-screen place-items-center bg-soft px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo size={34} /></div>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <h1 className="text-lg font-extrabold">Şifre yenileme</h1>
          <p className="mt-1 text-sm text-mute">Ekip e-postanı yaz, yenileme bağlantısı gönderelim.</p>
          <ActionForm action={staffForgot} className="mt-5 flex flex-col gap-4">
            <Field label="E-posta"><Input name="email" type="email" required autoFocus /></Field>
            <SubmitButton size="lg">Bağlantı gönder</SubmitButton>
          </ActionForm>
        </div>
        <p className="mt-4 text-center text-sm"><Link href="/admin/giris" className="font-bold text-link">← Girişe dön</Link></p>
      </div>
    </main>
  );
}
