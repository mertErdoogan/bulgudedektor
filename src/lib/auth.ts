import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, users } from "@/db/schema";
import { ADMIN_COOKIE, CUSTOMER_COOKIE, verifyToken } from "./session";
import { can, type Permission } from "./permissions";

export type StaffSession = {
  id: string;
  name: string;
  email: string;
  roleKey: string;
  roleName: string;
  permissions: string[];
  maxDiscountPct: number;
};

export const getStaff = cache(async (): Promise<StaffSession | null> => {
  const jar = await cookies();
  const payload = await verifyToken(jar.get(ADMIN_COOKIE)?.value);
  if (!payload || payload.kind !== "staff") return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, payload.sub), with: { role: true } });
  if (!user || !user.isActive) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roleKey: user.role.key,
    roleName: user.role.name,
    permissions: user.role.permissions,
    maxDiscountPct: user.maxDiscountPct,
  };
});

/** Sayfa ve server action'larda kullanılır: oturum yoksa girişe, yetki yoksa panoya yönlendirir. */
export async function requireStaff(permission?: Permission) {
  const staff = await getStaff();
  if (!staff) redirect("/admin/giris");
  if (permission && !can(staff.permissions, permission)) redirect("/admin?yetki=yok");
  return staff;
}

/** Server action'larda: yetki yoksa hata fırlatır (form hata mesajı gösterir). */
export async function assertStaff(permission?: Permission) {
  const staff = await getStaff();
  if (!staff) throw new Error("Oturum süresi doldu, lütfen tekrar giriş yapın.");
  if (permission && !can(staff.permissions, permission)) throw new Error("Bu işlem için yetkiniz yok.");
  return staff;
}

export const getCustomer = cache(async () => {
  const jar = await cookies();
  const payload = await verifyToken(jar.get(CUSTOMER_COOKIE)?.value);
  if (!payload || payload.kind !== "customer") return null;
  const c = await db.query.customers.findFirst({ where: eq(customers.id, payload.sub) });
  if (!c || c.isBlocked) return null;
  return c;
});
