import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <Logo size={34} />
        <h1 className="font-display mt-6 text-3xl font-extrabold">Burada sinyal yok.</h1>
        <p className="mt-2 text-mute">Aradığın sayfa kaldırılmış veya adres yanlış olabilir.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/" className="rounded-lg bg-brand px-5 py-3 font-bold text-white">Ana sayfa</Link>
          <Link href="/sihirbaz" className="rounded-lg border border-deep px-5 py-3 font-bold">Bana hangisi?</Link>
        </div>
      </div>
    </main>
  );
}
