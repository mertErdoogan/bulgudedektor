import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

export const ADMIN_COOKIE = "bulgu_admin";
export const CUSTOMER_COOKIE = "bulgu_customer";

type Payload = { sub: string; kind: "staff" | "customer" };

export async function signToken(payload: Payload, days = 7) {
  return new SignJWT({ kind: payload.kind })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secret());
}

export async function verifyToken(token: string | undefined): Promise<Payload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return { sub: payload.sub, kind: payload.kind as Payload["kind"] };
  } catch {
    return null;
  }
}

export async function setSessionCookie(name: string, token: string, days = 7) {
  const jar = await cookies();
  jar.set(name, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: days * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(name: string) {
  const jar = await cookies();
  jar.delete(name);
}
