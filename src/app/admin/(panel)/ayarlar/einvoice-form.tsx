"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ActionButton } from "@/components/admin/delete-button";
import { Field, Input, Select } from "@/components/ui";
import { CopyText } from "@/components/store/copy-text";
import { rotateBirfaturaToken, saveEInvoice, testParasut } from "./actions";

type Props = {
  s: {
    provider: "" | "parasut" | "birfatura";
    autoIssue: "off" | "paid" | "shipped";
    vatRate: number;
    parasutCompanyId: string;
    parasutClientId: string;
    parasutClientSecret: string;
    parasutUsername: string;
    parasutPassword: string;
    birfaturaToken: string;
    birfaturaLastPullAt: string;
    birfaturaLastPullCount: number;
  };
  siteUrl: string;
};

const PROVIDERS = [
  { k: "", title: "Kapalı (elle)", text: "Faturayı kendi programında kesip PDF'i ya da bağlantısını sipariş sayfasından eklersin." },
  { k: "parasut", title: "Paraşüt", text: "Site, faturayı Paraşüt'te oluşturur. Alıcı e-fatura mükellefiyse e-Fatura, değilse e-Arşiv otomatik seçilir. Numara ve PDF siparişe eklenir, müşteriye e-postayla gider." },
  { k: "birfatura", title: "BirFatura", text: "BirFatura siparişleri siteden çeker. Faturayı BirFatura panelinden (ya da oradaki otomatik kurala göre) kesersin; numara ve PDF siteye kendiliğinden geri yazılır. Kargo takip no da gelir." },
] as const;

export function EInvoiceForm({ s, siteUrl }: Props) {
  const [provider, setProvider] = useState(s.provider);
  const mask = (v: string) => (v ? `${v.slice(0, 3)}••••••••${v.slice(-2)}` : "");
  const bfUrl = `${siteUrl.replace(/\/$/, "")}/api/birfatura`;
  return (
    <ActionForm action={saveEInvoice} className="flex flex-col gap-5 p-5" data-testid="einvoice-settings">
      <input type="hidden" name="provider" value={provider} />
      <div className="grid gap-2 md:grid-cols-3" role="radiogroup" aria-label="Fatura programı">
        {PROVIDERS.map((p) => (
          <button
            key={p.k}
            type="button"
            role="radio"
            aria-checked={provider === p.k}
            onClick={() => setProvider(p.k)}
            className={`flex flex-col gap-1 rounded-xl border p-3.5 text-left text-sm transition ${provider === p.k ? "border-deep bg-soft ring-1 ring-deep" : "border-line hover:border-deep/40"}`}
            data-testid={`einvoice-${p.k || "off"}`}
          >
            <b>{p.title}</b>
            <span className="text-xs leading-relaxed text-mute">{p.text}</span>
          </button>
        ))}
      </div>

      {provider === "parasut" ? (
        <div className="flex flex-col gap-4">
          <ol className="list-decimal rounded-xl bg-soft p-4 pl-8 text-[13px] leading-relaxed text-mute">
            <li>Paraşüt hesabında e-Fatura/e-Arşiv kullanımının açık olduğundan emin ol.</li>
            <li>API erişimi için Paraşüt desteğinden <b>client ID</b> ve <b>client secret</b> iste (Paraşüt → Yardım → Destek talebi: &quot;API erişimi&quot;).</li>
            <li>Firma numarası, Paraşüt&apos;e girişte adres çubuğundaki sayıdır: uygulama.parasut.com/<b>123456</b>/…</li>
            <li>Kullanıcı olarak ayrı bir &quot;entegrasyon&quot; kullanıcısı açman önerilir; şifresi değişirse burayı da güncelle.</li>
          </ol>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Firma numarası"><Input name="parasutCompanyId" defaultValue={s.parasutCompanyId} inputMode="numeric" placeholder="123456" /></Field>
            <Field label="Client ID"><Input name="parasutClientId" defaultValue={s.parasutClientId} autoComplete="off" /></Field>
            <Field label="Client secret"><Input name="parasutClientSecret" defaultValue={mask(s.parasutClientSecret)} autoComplete="off" /></Field>
            <Field label="Kullanıcı e-postası"><Input name="parasutUsername" type="email" defaultValue={s.parasutUsername} autoComplete="off" /></Field>
            <Field label="Şifre"><Input name="parasutPassword" type="password" defaultValue={mask(s.parasutPassword)} autoComplete="new-password" /></Field>
            <Field label="Otomatik fatura" hint="Kapalıysa sipariş sayfasındaki 'Faturayı kes' düğmesiyle kesersin.">
              <Select name="autoIssue" defaultValue={s.autoIssue}>
                <option value="off">Kapalı (düğmeyle keserim)</option>
                <option value="paid">Ödeme alınınca kes</option>
                <option value="shipped">Kargoya verilince kes</option>
              </Select>
            </Field>
            <Field label="Varsayılan KDV oranı (%)" hint="Ürün kartında KDV oranı varsa o kullanılır; kargo bedeli bu oranla faturalanır.">
              <Select name="vatRate" defaultValue={String(s.vatRate)}>
                {[20, 10, 1, 0].map((v) => <option key={v} value={v}>%{v}</option>)}
              </Select>
            </Field>
          </div>
          <p className="text-xs leading-relaxed text-mute">Pazaryeri (Trendyol, Hepsiburada) siparişleri burada faturalanmaz; onlar pazaryeri entegrasyonuyla kesilir. İptal/iade olan siparişte iade faturasını Paraşüt&apos;te elle düzenlersin; site seni sipariş notuyla uyarır.</p>
        </div>
      ) : (
        <>
          <input type="hidden" name="autoIssue" value={s.autoIssue} />
          <input type="hidden" name="vatRate" value={s.vatRate} />
          <input type="hidden" name="parasutCompanyId" value={s.parasutCompanyId} />
          <input type="hidden" name="parasutClientId" value={s.parasutClientId} />
          <input type="hidden" name="parasutClientSecret" value={mask(s.parasutClientSecret)} />
          <input type="hidden" name="parasutUsername" value={s.parasutUsername} />
          <input type="hidden" name="parasutPassword" value={mask(s.parasutPassword)} />
        </>
      )}

      {provider === "birfatura" ? (
        <div className="flex flex-col gap-3">
          <ol className="list-decimal rounded-xl bg-soft p-4 pl-8 text-[13px] leading-relaxed text-mute">
            <li>Önce bu sayfayı <b>Kaydet</b>: bağlantı anahtarı üretilir.</li>
            <li>BirFatura → Entegrasyonlar → <b>Özel Entegrasyon</b> → Yeni mağaza ekle.</li>
            <li>&quot;Site adresi&quot; ve &quot;API şifresi&quot; alanlarına aşağıdaki değerleri yapıştır, &quot;Bağlantıyı test et&quot;e bas.</li>
            <li>Sipariş durumu olarak &quot;Ödendi / onaylandı&quot;yı seçersen yalnızca ödemesi alınmış siparişler faturalanır.</li>
          </ol>
          <Field label="Site adresi">
            <div className="flex items-center gap-2"><Input value={bfUrl} readOnly className="font-mono text-[13px]" /><CopyText value={bfUrl} /></div>
          </Field>
          {s.birfaturaToken ? (
            <Field label="API şifresi (token)" hint="Bu değeri yalnızca BirFatura'ya yaz; başkasıyla paylaşma.">
              <div className="flex items-center gap-2"><Input value={s.birfaturaToken} readOnly className="font-mono text-[13px]" data-testid="birfatura-token" /><CopyText value={s.birfaturaToken} /></div>
            </Field>
          ) : (
            <p className="text-sm font-semibold text-warn">Anahtar henüz yok: kaydedince üretilecek.</p>
          )}
          <p className="text-sm text-mute" data-testid="birfatura-last-pull">
            {s.birfaturaLastPullAt ? `Son çekme: ${new Date(s.birfaturaLastPullAt).toLocaleString("tr-TR")} · ${s.birfaturaLastPullCount} sipariş` : "BirFatura henüz sipariş çekmedi. Bağlantıyı BirFatura panelinden test et."}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton>Kaydet</SubmitButton>
        {provider === "parasut" && s.provider === "parasut" ? <ActionButton variant="outline" run={testParasut}>Bağlantıyı test et</ActionButton> : null}
        {provider === "birfatura" && s.birfaturaToken ? <ActionButton variant="ghost" run={rotateBirfaturaToken}>Anahtarı yenile</ActionButton> : null}
      </div>
    </ActionForm>
  );
}
