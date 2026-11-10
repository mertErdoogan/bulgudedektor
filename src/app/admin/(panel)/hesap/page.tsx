import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ActionButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { Card, CardHeader, Field, Input } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { openSecret, otpauthUri } from "@/lib/totp";
import { changeMyPassword, confirm2fa, disable2fa, start2fa } from "./actions";

export const metadata = { title: "Hesabım" };

export default async function MyAccountPage() {
  const staff = await requireStaff();
  const [u, s] = await Promise.all([db.query.users.findFirst({ where: eq(users.id, staff.id) }), getSettings()]);
  const pending = !u?.totpEnabled ? openSecret(u?.totpSecret) : null;
  const qr = pending ? await QRCode.toDataURL(otpauthUri(pending, staff.email, s.store.name), { margin: 1, width: 220 }) : null;
  return (
    <>
      <PageHeader title="Hesabım" description={`${staff.name} · ${staff.email} · ${staff.roleName}`} />
      <div className="grid max-w-4xl gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="İki adımlı doğrulama" description="Şifren ele geçse bile telefonundaki kod olmadan panele girilemez. Yönetici ve muhasebe hesaplarında mutlaka aç." />
          <div className="flex flex-col gap-4 p-5 text-sm">
            {u?.totpEnabled ? (
              <>
                <p className="flex items-center gap-2 font-bold text-ok">
                  <ShieldCheck size={18} /> Açık
                </p>
                <ActionForm action={disable2fa} className="flex flex-col gap-2">
                  <Field label="Kapatmak için şifren">
                    <Input name="current" type="password" autoComplete="current-password" required />
                  </Field>
                  <SubmitButton variant="outline" size="sm">
                    Kapat
                  </SubmitButton>
                </ActionForm>
              </>
            ) : pending && qr ? (
              <>
                <ol className="list-decimal space-y-1 pl-5">
                  <li>Telefonuna Google Authenticator, Microsoft Authenticator ya da 1Password kur.</li>
                  <li>Uygulamada &quot;Kod ekle&quot; deyip aşağıdaki kare kodu okut.</li>
                  <li>Uygulamada çıkan 6 haneli kodu yazıp onayla.</li>
                </ol>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="Doğrulama uygulaması kare kodu" width={220} height={220} className="rounded-lg border border-line" />
                <p className="text-xs text-mute">
                  Okutamıyorsan elle gir: <code className="break-all select-all">{pending.match(/.{1,4}/g)?.join(" ")}</code>
                </p>
                <ActionForm action={confirm2fa} className="flex items-end gap-2">
                  <Field label="6 haneli kod" className="flex-1">
                    <Input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required />
                  </Field>
                  <SubmitButton>Onayla</SubmitButton>
                </ActionForm>
              </>
            ) : (
              <ActionButton run={start2fa}>Kurulumu başlat</ActionButton>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Şifre değiştir" />
          <ActionForm action={changeMyPassword} className="flex flex-col gap-3 p-5">
            <Field label="Mevcut şifre">
              <Input name="current" type="password" autoComplete="current-password" required />
            </Field>
            <Field label="Yeni şifre" hint="En az 10 karakter">
              <Input name="password" type="password" autoComplete="new-password" minLength={10} required />
            </Field>
            <Field label="Yeni şifre (tekrar)">
              <Input name="password2" type="password" autoComplete="new-password" minLength={10} required />
            </Field>
            <SubmitButton className="self-start">Güncelle</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
