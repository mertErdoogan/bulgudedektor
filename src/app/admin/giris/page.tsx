import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Logo } from "@/components/logo";
import { Field, Input } from "@/components/ui";
import { getStaff } from "@/lib/auth";
import { loginAction } from "./actions";

export const metadata = { title: "Yönetim girişi" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getStaff()) redirect("/admin");
  const { next } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-soft px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo size={34} />
        </div>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <h1 className="text-lg font-extrabold">Yönetim paneli</h1>
          <p className="mt-1 text-sm text-mute">Ekip hesabınla giriş yap.</p>
          <ActionForm action={loginAction} className="mt-5 flex flex-col gap-4">
            <input type="hidden" name="next" value={next ?? "/admin"} />
            <Field label="E-posta">
              <Input name="email" type="email" autoComplete="username" required autoFocus />
            </Field>
            <Field label="Şifre">
              <Input name="password" type="password" autoComplete="current-password" required />
            </Field>
            <SubmitButton size="lg" pendingText="Giriş yapılıyor…">
              Giriş yap
            </SubmitButton>
          </ActionForm>
        </div>
        <p className="mt-4 text-center text-sm"><Link href="/admin/giris/sifremi-unuttum" className="font-bold text-link">Şifremi unuttum</Link></p>
      </div>
    </main>
  );
}
