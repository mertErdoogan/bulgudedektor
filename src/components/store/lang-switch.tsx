import { Globe } from "lucide-react";
import { LOCALE_LABEL, LOCALE_SHORT, localePath, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/** Dil seçici: aynı sayfanın diğer dildeki adresine gider (tam sayfa yükleme; sayfa o dilde sunucuda üretilir). */
export function LangSwitch({ langs, current, path, className }: { langs: readonly Locale[]; current: Locale; path: string; className?: string }) {
  return (
    <span className={cn("flex items-center gap-1", className)} data-testid="lang-switch">
      <Globe size={14} aria-hidden className="opacity-70" />
      {langs.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i ? <span className="opacity-40">/</span> : null}
          {l === current ? (
            <b aria-current="true" title={LOCALE_LABEL[l]}>{LOCALE_SHORT[l]}</b>
          ) : (
            <a href={localePath(path, l)} hrefLang={l} lang={l} title={LOCALE_LABEL[l]} className="opacity-70 hover:opacity-100 hover:underline">
              {LOCALE_SHORT[l]}
            </a>
          )}
        </span>
      ))}
    </span>
  );
}
