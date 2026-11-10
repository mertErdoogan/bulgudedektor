"use client";

import { useEffect } from "react";

/** Beklenmeyen hata sayfası (mağaza ve panel). Hata sunucuya zaten instrumentation.ts ile bildirilir. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-[70vh] place-items-center px-4 py-16 text-center">
      <div className="max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/arena-logo.svg" alt="Arena Dedektör" className="mx-auto h-12" />
        <h1 className="font-display mt-8 text-3xl font-extrabold">Bir sorun oluştu</h1>
        <p className="mt-2 text-mute">Sayfayı yüklerken beklenmeyen bir hata oldu. Sepetin ve siparişlerin güvende; tekrar denemen yeterli.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={reset} className="h-11 rounded-lg bg-brand px-5 text-sm font-extrabold text-white">Tekrar dene</button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="flex h-11 items-center rounded-lg border border-deep px-5 text-sm font-extrabold">Ana sayfa</a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/iletisim" className="flex h-11 items-center rounded-lg bg-soft px-5 text-sm font-extrabold">Bize ulaş</a>
        </div>
        {error.digest ? <p className="mt-6 text-xs text-mute">Hata kodu: {error.digest}</p> : null}
      </div>
    </main>
  );
}
