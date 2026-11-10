import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Logo } from "@/components/logo";
import { Field, Input } from "@/components/ui";
import { TWOFA_COOKIE, verifyToken } from "@/lib/session";
import { verify2faAction } from "../actions";

export const metadata = { title: "İki adımlı doğrulama", robots: { index: false } };

export default async function Verify2faPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const p = await verifyToken((await cookies()).get(TWOFA_COOKIE)?.value);
  if (!p || p.kind !== "staff-2fa") redirect("/admin/giris");
  const { next } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-soft px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo size={34} />
        </div>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <h1 className="text-lg font-extrabold">Doğrulama kodu</h1>
          <p className="mt-1 text-sm text-mute">Telefonundaki doğrulama uygulamasında (Google Authenticator, Microsoft Authenticator vb.) görünen 6 haneli kodu gir.</p>
          <ActionForm action={verify2faAction} className="mt-5 flex flex-col gap-4">
            <input type="hidden" name="next" value={next ?? "/admin"} />
            <Field label="6 haneli kod">
              <Input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus className="text-center text-xl tracking-[0.4em]" />
            </Field>
            <SubmitButton size="lg" pendingText="Doğrulanıyor…">
              Doğrula
            </SubmitButton>
          </ActionForm>
        </div>
        <p className="mt-4 text-center text-sm text-mute">
          Telefonuna erişemiyorsan bir yöneticiden iki adımlı doğrulamanı sıfırlamasını iste. <Link href="/admin/giris" className="font-bold text-link">Geri dön</Link>
        </p>
      </div>
    </main>
  );
}
