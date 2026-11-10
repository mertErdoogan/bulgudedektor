import Link from "next/link";
import { revokeMarketing, unsubKey } from "@/lib/store";

export const metadata = { title: "E-posta listesinden çık", robots: { index: false } };

async function unsubscribe(fd: FormData) {
  "use server";
  const { redirect } = await import("next/navigation");
  const email = String(fd.get("e") ?? "").toLowerCase();
  if (String(fd.get("k")) !== unsubKey(email)) redirect("/bulten/cikis?hata=1");
  await revokeMarketing(email);
  redirect("/bulten/cikis?tamam=1");
}

/** Bağlantıya tıklamak tek başına listeden çıkarmaz (e-posta tarayıcıları linkleri otomatik açabilir); onay düğmesi gerekir. */
export default async function UnsubPage({ searchParams }: { searchParams: Promise<{ e?: string; k?: string; tamam?: string; hata?: string }> }) {
  const sp = await searchParams;
  const valid = !!sp.e && sp.k === unsubKey(sp.e);
  return (
    <div className="container-x max-w-md py-16 text-center">
      <h1 className="font-display text-2xl font-extrabold">E-posta tercihleri</h1>
      {sp.tamam ? (
        <p className="mt-4 rounded-xl bg-ok-bg p-4 font-semibold text-ok">Listeden çıkarıldın. Artık kampanya ve hatırlatma e-postası göndermeyeceğiz. Sipariş bilgilendirmeleri gelmeye devam eder.</p>
      ) : valid ? (
        <form action={unsubscribe} className="mt-4">
          <input type="hidden" name="e" value={sp.e} />
          <input type="hidden" name="k" value={sp.k} />
          <p className="text-mute"><b className="text-deep">{sp.e}</b> adresine kampanya ve hatırlatma e-postaları gönderilmesin mi?</p>
          <button className="mt-5 h-12 rounded-lg bg-deep px-6 text-sm font-extrabold text-white">Evet, listeden çıkar</button>
        </form>
      ) : (
        <p className="mt-4 rounded-xl bg-warn-bg p-4 text-warn">Bağlantı geçersiz. Hesabına giriş yapıp <Link href="/hesabim" className="font-bold underline">hesabım</Link> sayfasından tercihini değiştirebilirsin.</p>
      )}
      <Link href="/" className="mt-6 inline-block text-sm font-bold text-link">Ana sayfaya dön</Link>
    </div>
  );
}
