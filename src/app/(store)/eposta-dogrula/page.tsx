import Link from "next/link";
import { and, eq, isNull } from "drizzle-orm";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { checkEmailToken } from "@/lib/account";

export const metadata = { title: "E-posta doğrulama", robots: { index: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ e?: string; x?: string; t?: string }> }) {
  const sp = await searchParams;
  const email = (sp.e ?? "").toLowerCase();
  const valid = checkEmailToken(email, sp.x ?? "", sp.t ?? "");
  if (valid) await db.update(customers).set({ emailVerifiedAt: new Date() }).where(and(eq(customers.email, email), isNull(customers.emailVerifiedAt)));
  return (
    <div className="container-x max-w-md py-16 text-center">
      {valid ? <CheckCircle2 size={44} className="mx-auto text-ok" /> : <CircleAlert size={44} className="mx-auto text-danger" />}
      <h1 className="font-display mt-4 text-2xl font-extrabold">{valid ? "E-posta adresin doğrulandı" : "Bağlantı geçersiz"}</h1>
      <p className="mt-2 text-sm text-mute">{valid ? "Teşekkürler! Sipariş, kargo ve garanti bildirimlerini bu adrese göndereceğiz." : "Bağlantının süresi dolmuş olabilir. Hesabım sayfasından yeni doğrulama e-postası isteyebilirsin."}</p>
      <Link href="/hesabim" className="mt-6 inline-block rounded-lg bg-deep px-5 py-2.5 text-sm font-bold text-white">
        Hesabıma git
      </Link>
    </div>
  );
}
