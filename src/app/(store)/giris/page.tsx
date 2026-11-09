import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Input } from "@/components/ui";
import { getCustomer } from "@/lib/auth";
import { customerLogin } from "../hesabim/actions";

export const metadata = { title: "Giriş yap", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCustomer()) redirect(next ?? "/hesabim");
  return (
    <div className="container-x max-w-md py-12">
      <h1 className="font-display text-2xl font-extrabold">Giriş yap</h1>
      <p className="mt-1 text-sm text-mute">Cihazların, garantin ve servis kayıtların hesabında.</p>
      <ActionForm action={customerLogin} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="E-posta veya cep telefonu"><Input name="id" autoComplete="username" required className="h-12" /></Field>
        <Field label="Şifre"><Input name="password" type="password" autoComplete="current-password" required className="h-12" /></Field>
        <SubmitButton size="lg">Giriş yap</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-sm">Hesabın yok mu? <Link href={`/kayit${next ? `?next=${next}` : ""}`} className="font-bold text-link">Kayıt ol</Link></p>
      <p className="mt-2 text-sm text-mute">Şifreni unuttuysan <Link href="/iletisim?konu=sifre" className="font-bold text-link">bize yaz</Link>, hemen sıfırlayalım.</p>
    </div>
  );
}
