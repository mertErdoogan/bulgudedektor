/**
 * Hazır yanıt şablonları: değişkenler süslü parantezle yazılır, gönderim anında doldurulur.
 * Hem sunucuda hem tarayıcıda çalışır (yalnızca saf fonksiyonlar).
 */
export const TEMPLATE_VARS: { key: string; label: string }[] = [
  { key: "ad", label: "Müşterinin adı" },
  { key: "ad_soyad", label: "Müşterinin adı soyadı" },
  { key: "siparis_no", label: "Sipariş numarası" },
  { key: "tutar", label: "Sipariş tutarı" },
  { key: "siparis_link", label: "Sipariş takip bağlantısı" },
  { key: "kargo_firma", label: "Kargo firması" },
  { key: "takip_no", label: "Kargo takip numarası" },
  { key: "takip_link", label: "Kargo takip bağlantısı" },
  { key: "iban", label: "Banka hesapları" },
  { key: "magaza", label: "Mağaza adı" },
  { key: "telefon", label: "Mağaza telefonu" },
  { key: "whatsapp", label: "Mağaza WhatsApp" },
  { key: "adres", label: "Showroom adresi" },
  { key: "personel", label: "Senin adın" },
];

export const TEMPLATE_CATEGORIES: Record<string, string> = {
  genel: "Genel",
  siparis: "Sipariş",
  havale: "Havale / ödeme",
  kargo: "Kargo",
  servis: "Servis ve garanti",
  iade: "İade",
  satis: "Satış danışmanlığı",
};

export function fillTemplate(body: string, vars: Record<string, string | null | undefined>) {
  return body.replace(/\{([a-z_]+)\}/g, (m, k: string) => {
    const v = vars[k];
    return v === undefined ? m : (v ?? "");
  });
}

/** Doldurulmamış değişken kaldıysa (ör. kargo yokken {takip_no}) uyarı için listeler. */
export const missingVars = (text: string) => [...new Set([...text.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]))];

export const DEFAULT_TEMPLATES: { title: string; category: string; subject?: string; body: string }[] = [
  {
    title: "Havale hatırlatma",
    category: "havale",
    subject: "{siparis_no} numaralı siparişin için ödeme bekliyoruz",
    body: "Merhaba {ad},\n{siparis_no} numaralı {tutar} tutarındaki siparişin için havale/EFT ödemesini bekliyoruz. Açıklamaya sipariş numaranı yazmayı unutma:\n{iban}\nÖdemeyi yaptıktan sonra sipariş sayfandan dekontu yükleyebilirsin: {siparis_link}\nSorun olursa {telefon} numarasından bize ulaşabilirsin.\n{magaza}",
  },
  {
    title: "Ödeme alındı, hazırlanıyor",
    category: "siparis",
    subject: "Ödemen alındı · {siparis_no}",
    body: "Merhaba {ad}, ödemen hesabımıza geçti, teşekkürler. {siparis_no} numaralı siparişin hazırlanıyor; kargoya verince takip numarasını ileteceğiz.\n{magaza}",
  },
  {
    title: "Kargoya verildi",
    category: "kargo",
    subject: "Siparişin kargoda · {siparis_no}",
    body: "Merhaba {ad}, {siparis_no} numaralı siparişin {kargo_firma} ile yola çıktı. Takip no: {takip_no}\nTakip: {takip_link}\nCihazın kurulumu ve ilk kullanımı için soruların olursa WhatsApp'tan yazabilirsin: {whatsapp}",
  },
  {
    title: "Kargo gecikmesi",
    category: "kargo",
    subject: "Siparişin hakkında bilgilendirme · {siparis_no}",
    body: "Merhaba {ad}, {siparis_no} numaralı siparişin kargo firmasındaki yoğunluk nedeniyle planlanandan biraz geç ulaşabilir. Takip: {takip_link}\nGecikme için özür dileriz; durumu biz de takip ediyoruz.\n{personel} · {magaza}",
  },
  {
    title: "Stokta yok, tedarik süresi",
    category: "siparis",
    body: "Merhaba {ad}, {siparis_no} numaralı siparişindeki ürün distribütör stoğumuza geliyor; tahmini kargo tarihi önümüzdeki hafta. Beklemek istemezsen iptal edip ücret iadesi yapabiliriz ya da muadil bir model önerebiliriz. Nasıl ilerleyelim?\n{personel} · {magaza}",
  },
  {
    title: "Teslim sonrası kurulum desteği",
    category: "satis",
    body: "Merhaba {ad}, cihazın eline ulaştı mı? İlk kurulum, başlık değişimi ya da ayarlar konusunda takıldığın bir yer olursa yazman yeterli; telefonla da yardımcı olabiliriz. İyi aramalar dileriz!\n{personel} · {magaza}",
  },
  {
    title: "Servis: cihaz ulaştı",
    category: "servis",
    body: "Merhaba {ad}, servise gönderdiğin cihaz bize ulaştı, teknik ekibimiz inceliyor. İnceleme sonucunu ve varsa ücret bilgisini paylaşacağız.\n{magaza} · {telefon}",
  },
  {
    title: "Servis: cihaz hazır",
    category: "servis",
    body: "Merhaba {ad}, cihazının servis işlemi tamamlandı. Kargoyla gönderebilir ya da showroomumuzdan teslim alabilirsin: {adres}\nHangisini tercih edersin?\n{magaza}",
  },
  {
    title: "İade talebi onaylandı",
    category: "iade",
    body: "Merhaba {ad}, {siparis_no} numaralı siparişin için iade talebini onayladık. Ürünü kutusu, faturası ve tüm aksesuarlarıyla anlaşmalı kargo koduyla gönderebilirsin. Ürün bize ulaşıp kontrol edildikten sonra ücret iaden en geç 14 gün içinde yapılır.\n{magaza}",
  },
  {
    title: "Model önerisi (danışmanlık)",
    category: "satis",
    body: "Merhaba {ad}, ilgin için teşekkürler! Doğru cihazı önerebilmemiz için birkaç bilgi rica edelim: 1) Ne arıyorsun (sikke, define, altın)? 2) Arazi nasıl (toprak, kayalık, sahil/su)? 3) Bütçe aralığın nedir? Dilersen {telefon} numarasından arayabilir ya da showroomumuza uğrayabilirsin: {adres}\n{personel}",
  },
];

type OrderLike = {
  id: string;
  number: number;
  total: number;
  shippingAddress: { fullName?: string } | null;
  carrier: string | null;
  trackingNumber: string | null;
};
type StoreLike = { name: string; phone: string; whatsapp: string; address: string };

export function orderVars(o: OrderLike, ctx: { store: StoreLike; banks: { bank: string; iban: string }[]; trackingTemplates: Record<string, string>; orderLink: string; staffName: string; formatTL: (n: number) => string; orderNo: (n: number) => string }) {
  const full = o.shippingAddress?.fullName ?? "";
  const tpl = o.carrier ? ctx.trackingTemplates[o.carrier] : undefined;
  return {
    ...storeVars(ctx.store, ctx.banks, ctx.staffName),
    ad: full.split(" ")[0] || "",
    ad_soyad: full,
    siparis_no: ctx.orderNo(o.number),
    tutar: ctx.formatTL(o.total),
    siparis_link: ctx.orderLink,
    kargo_firma: o.carrier ?? undefined,
    takip_no: o.trackingNumber ?? undefined,
    takip_link: tpl && o.trackingNumber ? tpl.replace("{code}", o.trackingNumber) : undefined,
  } as Record<string, string | undefined>;
}

export function storeVars(store: StoreLike, banks: { bank: string; iban: string }[], staffName: string) {
  const wa = store.whatsapp?.replace(/\D/g, "");
  return {
    magaza: store.name,
    telefon: store.phone,
    whatsapp: wa ? `+${wa}` : store.phone,
    adres: store.address,
    iban: banks.map((b) => `${b.bank}: ${b.iban}`).join("\n"),
    personel: staffName.split(" ")[0],
  };
}
