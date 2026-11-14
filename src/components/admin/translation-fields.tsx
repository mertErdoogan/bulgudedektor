import { Languages } from "lucide-react";
import { Card, CardHeader, Field, Input, Textarea } from "@/components/ui";
import { DEFAULT_LOCALE, LOCALES, LOCALE_LABEL } from "@/lib/i18n/config";

export type TrField = { field: string; label: string; multiline?: boolean; hint?: string };

/**
 * Panel formlarında dil sekmeleri: her dil için çevrilecek alanlar. Boş bırakılan alan sitede Türkçe görünür.
 * Alan adları tr_<dil>_<alan> biçimindedir; kaydederken saveEntityTranslations okur.
 */
export function TranslationFields({ fields, values, enabled }: { fields: TrField[]; values?: Record<string, Record<string, string>>; enabled?: string[] }) {
  const others = LOCALES.filter((l) => l !== DEFAULT_LOCALE);
  return (
    <Card data-testid="translation-fields">
      <CardHeader title="Çeviriler" description="Boş bırakılan alan sitede Türkçe görünür. Dil, Ayarlar > Diller'den açılınca sitede yayınlanır." />
      <div className="flex flex-col gap-3 p-5 pt-0">
        {others.map((l) => (
          <details key={l} className="group rounded-xl border border-line" open={!!values?.[l] && Object.keys(values[l]).length > 0}>
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold [&::-webkit-details-marker]:hidden">
              <Languages size={16} /> {LOCALE_LABEL[l]}
              <span className="text-xs font-semibold text-mute">
                {Object.keys(values?.[l] ?? {}).length}/{fields.length} alan çevrildi{enabled && !enabled.includes(l) ? " · sitede kapalı" : ""}
              </span>
            </summary>
            <div className="grid gap-3 border-t border-line p-4 md:grid-cols-2">
              {fields.map((f) => (
                <Field key={f.field} label={f.label} hint={f.hint} className={f.multiline ? "md:col-span-2" : undefined}>
                  {f.multiline ? (
                    <Textarea name={`tr_${l}_${f.field}`} defaultValue={values?.[l]?.[f.field] ?? ""} className="min-h-[110px]" lang={l} />
                  ) : (
                    <Input name={`tr_${l}_${f.field}`} defaultValue={values?.[l]?.[f.field] ?? ""} lang={l} />
                  )}
                </Field>
              ))}
            </div>
          </details>
        ))}
      </div>
    </Card>
  );
}
