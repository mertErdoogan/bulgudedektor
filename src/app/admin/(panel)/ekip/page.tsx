import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { Badge, Button, Card, CardHeader, Checkbox, Field, Input, Select, Table, Td, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { PERMISSIONS, PERMISSION_GROUPS } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { deleteRole, saveRole, saveUser } from "./actions";

export const metadata = { title: "Ekip ve yetkiler" };

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ u?: string; r?: string; yeni?: string }> }) {
  await requireStaff("users.manage");
  const sp = await searchParams;
  const [list, roleRows] = await Promise.all([
    db.select({ u: users, role: roles.name }).from(users).innerJoin(roles, eq(roles.id, users.roleId)).orderBy(asc(users.name)),
    db.select().from(roles).orderBy(asc(roles.createdAt)),
  ]);
  const editUser = sp.u ? list.find((x) => x.u.id === sp.u)?.u : undefined;
  const editRole = sp.r ? roleRows.find((r) => r.id === sp.r) : undefined;
  return (
    <>
      <PageHeader title="Ekip ve yetkiler" description="Her rol sadece işine yarayan menüleri görür. Yetkisi olmayan sayfa ve işlem hem gizlenir hem sunucuda engellenir." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Ekip" action={<Button size="sm" asChild><Link href="/admin/ekip?yeni=1">+ Kişi ekle</Link></Button>} />
            <Table>
              <thead><tr><Th>Kişi</Th><Th>Rol</Th><Th>İndirim limiti</Th><Th>Son giriş</Th><Th>Durum</Th></tr></thead>
              <tbody>
                {list.map(({ u, role }) => (
                  <tr key={u.id} className={u.id === sp.u ? "bg-tint" : "hover:bg-soft/60"}>
                    <Td><Link href={`/admin/ekip?u=${u.id}`} className="font-bold hover:text-link">{u.name}</Link><span className="block text-xs text-mute">{u.email}</span></Td>
                    <Td>{role}</Td>
                    <Td>%{u.maxDiscountPct}</Td>
                    <Td className="text-mute">{formatDate(u.lastLoginAt, true)}</Td>
                    <Td>{u.isActive ? <Badge tone="ok">Aktif</Badge> : <Badge>Pasif</Badge>}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
          <Card>
            <CardHeader title="Roller" action={<Button size="sm" variant="outline" asChild><Link href="/admin/ekip?r=yeni">+ Rol ekle</Link></Button>} />
            <ul className="divide-y divide-line">
              {roleRows.map((r) => (
                <li key={r.id} className={`flex items-center gap-3 px-5 py-3 text-sm ${r.id === sp.r ? "bg-tint" : ""}`}>
                  <Link href={`/admin/ekip?r=${r.id}`} className="flex-1"><b className="hover:text-link">{r.name}</b><span className="block text-xs text-mute">{r.description}</span></Link>
                  <Badge>{r.permissions.length} yetki</Badge>
                  {!r.isSystem ? <DeleteButton run={deleteRole.bind(null, r.id)} confirmText={`${r.name} rolü silinsin mi?`} /> : <Badge tone="dark">Sistem</Badge>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="flex flex-col gap-5">
          {editRole || sp.r === "yeni" ? (
            <Card>
              <CardHeader title={editRole ? `Rol: ${editRole.name}` : "Yeni rol"} description={editRole?.isSystem ? "Yönetici rolü sabittir." : "İşaretlenen yetkiler bu roldeki herkese uygulanır."} />
              <ActionForm action={saveRole} key={editRole?.id ?? "new"} className="flex flex-col gap-4 p-5">
                {editRole ? <input type="hidden" name="id" value={editRole.id} /> : null}
                <fieldset disabled={editRole?.isSystem} className="flex flex-col gap-4">
                  <Field label="Rol adı"><Input name="name" defaultValue={editRole?.name} required /></Field>
                  <Field label="Açıklama"><Input name="description" defaultValue={editRole?.description ?? ""} /></Field>
                  {PERMISSION_GROUPS.map((g) => (
                    <div key={g.label}>
                      <p className="mb-2 text-xs font-bold tracking-wide text-mute uppercase">{g.label}</p>
                      <div className="flex flex-col gap-2">
                        {g.items.map((p) => <Checkbox key={p} name="permissions" value={p} defaultChecked={editRole?.permissions.includes(p)} label={PERMISSIONS[p]} />)}
                      </div>
                    </div>
                  ))}
                  {!editRole?.isSystem ? <SubmitButton>Rolü kaydet</SubmitButton> : null}
                </fieldset>
              </ActionForm>
            </Card>
          ) : (
            <Card>
              <CardHeader title={editUser ? `Düzenle: ${editUser.name}` : "Yeni ekip üyesi"} />
              <ActionForm action={saveUser} key={editUser?.id ?? "new"} className="flex flex-col gap-3 p-5">
                {editUser ? <input type="hidden" name="id" value={editUser.id} /> : null}
                <Field label="Ad soyad"><Input name="name" defaultValue={editUser?.name} required /></Field>
                <Field label="E-posta (giriş için)"><Input name="email" type="email" defaultValue={editUser?.email} required /></Field>
                <Field label="Rol">
                  <Select name="roleId" defaultValue={editUser?.roleId ?? roleRows.find((r) => r.key === "sales")?.id}>
                    {roleRows.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </Select>
                </Field>
                <Field label={editUser ? "Yeni şifre (değiştirmek için)" : "Şifre"} hint="En az 8 karakter"><Input name="password" type="text" autoComplete="new-password" required={!editUser} /></Field>
                <Field label="Satışta en fazla indirim %" hint="Telefon/showroom siparişlerinde uygulayabileceği indirim"><Input name="maxDiscountPct" type="number" min={0} max={100} defaultValue={editUser?.maxDiscountPct ?? 0} /></Field>
                <Checkbox name="isActive" defaultChecked={editUser?.isActive ?? true} label="Aktif (pasif kişi giriş yapamaz)" />
                <SubmitButton>{editUser ? "Kaydet" : "Ekle"}</SubmitButton>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
