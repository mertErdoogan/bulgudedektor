/**
 * Sözleşme ve yasal metinlerde {{unvan}}, {{adres}} gibi yer tutucuları ayarlardaki güncel
 * şirket bilgileriyle doldurur. Böylece vergi no / MERSİS gibi bilgiler panelden
 * (Ayarlar → Mağaza) girildiği anda tüm metinlerde güncellenir.
 */
type Store = {
  name: string;
  legalName: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  taxOffice: string;
  taxNumber: string;
  mersis: string;
  etbis: string;
};
type Payment = { bankAccounts: { bank: string; holder: string; iban: string }[]; maxInstallment: number; noInterestInstallments: number };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function legalTokens(store: Store, payment?: Payment, siteUrl = ""): Record<string, string> {
  const missing = "<em>(panelden eklenecek)</em>";
  const v = (s: string) => (s?.trim() ? esc(s.trim()) : missing);
  const wa = store.whatsapp?.replace(/\D/g, "");
  return {
    unvan: v(store.legalName || store.name),
    marka: v(store.name),
    adres: v(store.address),
    telefon: v(store.phone),
    whatsapp: wa ? `+${wa.replace(/^(\d{2})(\d{3})(\d{3})(\d{2})(\d{2})$/, "$1 $2 $3 $4 $5")}` : missing,
    eposta: v(store.email),
    vergi_dairesi: v(store.taxOffice),
    vergi_no: v(store.taxNumber),
    mersis: v(store.mersis),
    etbis: v(store.etbis),
    site: esc(/localhost|127\.0\.0\.1|\.local\b|\.test\b/.test(siteUrl) || !siteUrl ? "www.arenadedektor.com" : siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")),
    taksit: String(payment?.maxInstallment ?? 6),
    vade_farksiz: String(payment?.noInterestInstallments ?? 3),
    banka_hesaplari: payment?.bankAccounts?.length
      ? `<ul>${payment.bankAccounts.map((b) => `<li><strong>${esc(b.bank)}</strong> — ${esc(b.holder)}<br><code>${esc(b.iban)}</code></li>`).join("")}</ul>`
      : missing,
  };
}

export function fillLegal(html: string, tokens: Record<string, string>) {
  return html.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, k: string) => tokens[k] ?? m);
}
