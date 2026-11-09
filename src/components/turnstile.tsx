"use client";

import Script from "next/script";

/** Cloudflare Turnstile kutusu. NEXT_PUBLIC_TURNSTILE_SITE_KEY yoksa hiçbir şey çizmez. */
export function Turnstile() {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!key) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <div className="cf-turnstile" data-sitekey={key} data-language="tr" data-size="flexible" />
    </>
  );
}
