/**
 * SEO içerik tohumu: rehber yazılar, SSS, sözlük ve kategori rehber metinleri.
 * - `npm run db:seed` içinde demo verisiyle birlikte çalışır.
 * - Canlı ortamda tek başına: `npm run db:seed-content` (var olan kayıtlara dokunmaz, sadece eksikleri ekler).
 * İçerikler genel bilgilendirmedir; yayına almadan önce mağaza ekibi kendi deneyimiyle zenginleştirmeli.
 */
import "dotenv/config";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../src/db";
import * as t from "../src/db/schema";

const AUTHOR = { authorName: "Bulgu Dedektör Uzman Ekibi", authorTitle: "Saha ve satış sonrası destek ekibi" };
const days = (d: number) => new Date(Date.now() - d * 86400000);

type PostSeed = Omit<typeof t.posts.$inferInsert, "relatedProductIds" | "relatedCategoryIds"> & { productSkus?: string[]; categorySlugs?: string[] };

const POSTS: PostSeed[] = [
  {
    title: "Hangi metal dedektörünü almalıyım? Yeni başlayanlar için seçim rehberi",
    slug: "hangi-metal-dedektorunu-almaliyim",
    category: "Cihaz seçimi",
    excerpt: "Ne arayacağın, nerede arayacağın ve bütçen: doğru dedektörü bu üç soru belirler. Yeni başlayanlar için net öneriler.",
    answer:
      "Yeni başlıyorsan tarla ve harabede sikke, takı aramak için 12.000–35.000 TL bandında, hazır arama modları olan, en azından başlığı su geçirmez bir VLF veya çok frekanslı dedektör yeterlidir. Sahil düşünüyorsan çok frekanslı model al. Doğal altın ve çok derin hedefler için PI veya görüntüleme sistemleri ayrı bir sınıftır ve deneyim ister.",
    content: `## Önce şu üç soruyu yanıtla

Doğru dedektörü markadan önce **ne arayacağın**, **nerede arayacağın** ve **bütçen** belirler. Bu üç cevap netleştiğinde seçenekler 2–3 modele iner.

1. **Ne arıyorum?** Sikke ve takı mı, doğal altın mı, büyük ve derin metal kütleler mi?
2. **Nerede arayacağım?** Tarla ve bağ mı, mineralli taşlık arazi mi, ıslak sahil mi?
3. **Ne kadar ayırabilirim?** Cihaz + kürek + pinpointer + kulaklık toplamını düşün.

## Hangi arama için hangi teknoloji?

| Arama | Önerilen teknoloji | Neden |
|---|---|---|
| Tarla, bağ, harabe (sikke, takı) | VLF veya çok frekanslı | İyi ayrım, hafif, uygun fiyat |
| Islak sahil, sığ su | Çok frekanslı, su geçirmez | Tuzlu kumda kararlı çalışır |
| Doğal altın (nugget) | Yüksek frekanslı VLF veya PI | Küçük altına hassasiyet, mineralli zemin |
| Büyük ve derin hedefler | PI veya görüntüleme sistemi | Büyük başlık, derin sinyal |

## Yeni başlayan için hangi özellikler önemli?

- **Hazır arama modları:** Açıp "Park", "Arazi", "Sahil" seçip başlayabilmek ilk haftalarda çok zaman kazandırır.
- **Hedef ID numarası:** Ekrandaki sayı, hedefin demir mi yoksa değerli metal mi olduğunu tahmin etmene yardım eder.
- **Ağırlık:** 1,5 kg altı cihazlar saatlerce kullanımda yormaz.
- **Su geçirmez başlık:** Islak çimen ve yağmurda endişesiz arama sağlar.
- **Pinpoint:** Hedefin tam merkezini bulmak, gereksiz kazıyı azaltır.

## Bütçeye göre kabaca sınıflar

- **12.000–25.000 TL:** Giriş seviyesi. Hobi olarak tarla ve parkta arama için yeterli.
- **25.000–60.000 TL:** Orta seviye. Çok frekans, tam su geçirmezlik, daha iyi ayrım.
- **60.000 TL üzeri:** Profesyonel. Zor zemin, sahil-su altı ya da uzun saatler sahada olanlar için.
- **150.000 TL üzeri:** Doğal altın PI cihazları ve görüntüleme sistemleri; özel kullanım.

> İpucu: Pahalı cihaz, yanlış zeminde ucuz cihazdan daha kötü sonuç verebilir. Önce nerede arayacağını netleştir.

## En sık yapılan hatalar

- Sadece "en derine inen" cihazı aramak: Derinlik, hedefin büyüklüğüne ve zemine bağlıdır.
- Kulaklık kullanmamak: Zayıf sinyalleri kaçırırsın.
- Pinpointer almamak: Kazı süresi iki katına çıkar.
- Toprak dengelemeyi atlamak: Mineralli zeminde cihaz sürekli öter.

## Karar veremiyorsan

[6 soruluk seçim sihirbazını](/sihirbaz) dene ya da uzmanımıza WhatsApp'tan yaz; cihazları görüntülü görüşmede gösterebiliriz.`,
    faq: [
      { q: "İlk dedektör için ne kadar harcamalıyım?", a: "Hobi amaçlı tarla ve park aramaları için 12.000–35.000 TL arası bir cihaz yeterlidir. Pinpointer ve kulaklık için ayrıca bütçe ayırmanı öneririz." },
      { q: "Ucuz dedektör işe yarar mı?", a: "Yetkili distribütör garantili giriş seviyesi cihazlar hobi için iş görür. Garantisiz, markasız ve 'çok derine iner' iddialı cihazlardan kaçının." },
      { q: "Tek cihazla hem tarla hem sahil aranır mı?", a: "Evet, çok frekanslı ve su geçirmez modeller iki ortamda da iyi çalışır. Tek frekanslı VLF cihazlar ıslak tuzlu kumda zorlanır." },
    ],
    tags: ["dedektör seçimi", "yeni başlayan", "hangi dedektör"],
    productSkus: ["3820-0009", "GAR-ACE250", "3820-0001", "NOK-FINDXPRO"],
    categorySlugs: ["define-ve-sikke"],
    publishedAt: days(40),
  },
  {
    title: "VLF, çok frekanslı ve PI dedektör arasındaki fark nedir?",
    slug: "vlf-cok-frekansli-pi-dedektor-farki",
    category: "Karşılaştırma",
    excerpt: "Üç temel teknolojiyi sade bir dille karşılaştırdık: hangisi hangi zeminde ve hangi hedefte daha iyi?",
    answer:
      "VLF dedektörler tek frekansla çalışır; hafif, ucuzdur ve demiri iyi ayırır. Çok frekanslı dedektörler birden fazla frekansı aynı anda kullanır; sahilde ve karışık zeminde daha kararlıdır. PI (Pulse Induction) dedektörler mineralli zeminden az etkilenir ve büyük, derin hedeflerde güçlüdür ama demir ayrımı zayıftır ve pahalıdır.",
    content: `## Kısaca üç teknoloji

### VLF (Very Low Frequency, tek frekans)

Verici bobin sürekli tek bir frekansta sinyal yollar, alıcı bobin metalden dönen değişimi ölçer. **Hedef ayrımı (discrimination)** güçlüdür; demir çiviyi sikkeden ayırmak kolaydır.

- Düşük frekans (5–8 kHz): gümüş, bakır, büyük hedefler
- Yüksek frekans (15–45 kHz ve üzeri): küçük altın, ince takı

### Çok frekanslı (Multi-frequency)

Birden fazla frekansı **aynı anda** gönderir ve sonuçları birleştirir. Böylece hem küçük hem büyük hedefe, hem kuru hem ıslak zemine iyi tepki verir. Minelab Multi-IQ, Garrett Multi-Flex, XP FMF bu sınıftadır.

### PI (Pulse Induction)

Kısa ve güçlü darbeler gönderir, metaldeki sönümlenmeyi ölçer. **Mineralli zeminden ve tuzlu sudan çok az etkilenir.** Doğal altın sahalarında ve derin hedeflerde öne çıkar.

## Karşılaştırma tablosu

| Özellik | VLF | Çok frekanslı | PI |
|---|---|---|---|
| Demir ayrımı | Çok iyi | Çok iyi | Zayıf |
| Mineralli zemin | Orta | İyi | Çok iyi |
| Islak sahil | Zayıf | Çok iyi | Çok iyi |
| Küçük hedef | İyi (yüksek frekansta) | İyi | Modele göre |
| Ağırlık | Hafif | Hafif–orta | Ağır |
| Fiyat | Uygun | Orta | Yüksek |

## Hangisini seçmeliyim?

- **Tarla, bağ, harabe; sikke ve takı:** VLF veya çok frekanslı.
- **Sahil ve sığ su:** Çok frekanslı (su geçirmez).
- **Doğal altın, aşırı mineralli zemin:** PI veya altına özel yüksek frekanslı VLF.
- **Büyük ve derin hedef:** PI veya görüntüleme sistemleri.

> Not: "Derinlik" tek başına teknolojiyle belirlenmez. Hedefin boyutu, zeminin minerali ve başlık çapı en az teknoloji kadar etkilidir.`,
    faq: [
      { q: "Çok frekanslı dedektör daha mı derine iner?", a: "Her zaman değil. Çok frekansın asıl avantajı zor zeminlerde kararlılık ve farklı boyuttaki hedeflere dengeli tepkidir; derinlik hedef boyutuna ve zemine bağlıdır." },
      { q: "PI dedektörle demir ayırt edilir mi?", a: "Sınırlı ölçüde. PI cihazların çoğu demir ayrımında VLF ve çok frekanslı cihazlardan zayıftır; bu yüzden çöp metalin bol olduğu alanlarda yorucu olabilir." },
    ],
    tags: ["VLF", "PI", "çok frekans", "karşılaştırma"],
    productSkus: ["3720-0007", "XP-DEUS2-22", "3730-0001", "GAR-ACE250"],
    categorySlugs: ["define-ve-sikke", "dogal-altin"],
    publishedAt: days(33),
  },
  {
    title: "Türkiye'de metal dedektörü kullanmak yasal mı? Define arama izni rehberi",
    slug: "turkiyede-dedektor-kullanmak-yasal-mi",
    category: "Mevzuat",
    excerpt: "Dedektör almak serbest, peki arama yapmak? 2863 sayılı Kanun ve Define Arama Yönetmeliği'ne göre bilmen gerekenler.",
    answer:
      "Türkiye'de metal dedektörü satın almak ve bulundurmak serbesttir. Ancak define aramak, 2863 sayılı Kültür ve Tabiat Varlıklarını Koruma Kanunu ve Define Arama Yönetmeliği uyarınca Kültür ve Turizm Bakanlığından ruhsat alınmasını gerektirir. Sit alanları, ören yerleri ve mezarlıklarda arama yapılamaz; izinsiz kazı suçtur.",
    content: `> Bu yazı genel bilgilendirme amaçlıdır, hukuki danışmanlık değildir. Arama yapmadan önce il kültür ve turizm müdürlüğüne veya bir avukata danışmanızı öneririz.

## Dedektör satın almak yasal mı?

Evet. Metal dedektörü Türkiye'de serbestçe satılan bir cihazdır; satın almak ve bulundurmak için izin gerekmez. Bulgu Dedektör'den aldığın her cihaz faturalıdır.

## Define aramak için izin gerekir mi?

Evet. 2863 sayılı Kültür ve Tabiat Varlıklarını Koruma Kanunu'nun 50. maddesi ve buna dayanan **Define Arama Yönetmeliği**, define aramayı Kültür ve Turizm Bakanlığından alınacak **ruhsatnameye** bağlar. Bu kural özel mülk için de geçerlidir; arazinin sahibi olmak tek başına izin yerine geçmez.

## Hangi yerlerde arama yapılamaz?

- Sit alanları ve ören yerleri
- Tescilli kültür varlıklarının bulunduğu alanlar ve çevresi
- Mezarlıklar
- Askeri yasak bölgeler

## Bir şey bulursam ne yapmalıyım?

- **Kültür varlığı niteliğinde olabilecek buluntular** (eski sikke, tarihi obje): 2863 sayılı Kanun'a göre en yakın müze müdürlüğüne, köyde muhtarlığa veya mülki amirliğe bildirilmelidir.
- **Kayıp eşya** (yüzük, telefon, saat): Türk Medeni Kanunu'na göre sahibine ya da kolluğa bildirilmelidir.

## Sahilde kayıp takı aramak

Sahilde güncel kayıp takı aramaya dair özel ve açık bir düzenleme bulunmadığı yönünde yorumlar vardır; ancak bulunan eşyalar için bildirim yükümlülüğü geçerlidir ve sahil bir sit alanı içindeyse arama yapılamaz. Belediye ve kıyı mevzuatını da kontrol et.

## Ruhsat başvurusu nasıl yapılır?

Başvuru, Define Arama Yönetmeliği'nde belirtilen belgelerle valilik / il kültür ve turizm müdürlüğü üzerinden yapılır. Arama, görevli gözetiminde ve ruhsatta belirtilen alanla sınırlı yürütülür. Güncel belge listesi için il müdürlüğünle görüş.

## Özetle

| Durum | Yasal mı? |
|---|---|
| Dedektör satın almak, bulundurmak | Evet |
| Ruhsatla, gözetim altında define aramak | Evet |
| İzinsiz define arama ve kazı | Hayır |
| Sit alanı, ören yeri, mezarlıkta arama | Hayır |`,
    faq: [
      { q: "Dedektör almak için belge gerekir mi?", a: "Hayır. Metal dedektörü satın almak ve bulundurmak için izin veya belge gerekmez; cihaz faturayla satılır." },
      { q: "Kendi tarlamda dedektörle arama yapabilir miyim?", a: "Define arama amacı varsa kendi arazinde de Kültür ve Turizm Bakanlığından ruhsat alman gerekir. Mülkiyet tek başına izin yerine geçmez." },
      { q: "Eski bir sikke bulursam ne yapmalıyım?", a: "Kültür varlığı olabilecek buluntuları en yakın müze müdürlüğüne, köyde muhtarlığa veya mülki amirliğe bildirmelisin." },
    ],
    tags: ["mevzuat", "2863", "define arama izni", "yasal"],
    productSkus: [],
    categorySlugs: ["define-ve-sikke", "derin-arama"],
    publishedAt: days(26),
  },
  {
    title: "Dedektör kaç metreye iner? Derinliği belirleyen 6 faktör",
    slug: "dedektor-kac-metreye-iner",
    category: "Kullanım ve ayarlar",
    excerpt: "Kutudaki 'derinlik' rakamı neden sahada tutmaz? Gerçekçi beklentiler ve derinliği artırmanın yolları.",
    answer:
      "Standart bir hobi dedektörü, normal toprakta sikke büyüklüğündeki bir hedefi genellikle 20–35 cm derinlikte algılar. Daha büyük hedefler daha derinden alınır; büyük başlıklı PI cihazlar ve görüntüleme sistemleri büyük kütleleri metrelerce derinden sinyal verebilir. Derinliği hedef boyutu, zemin minerali, başlık çapı ve ayarlar belirler.",
    content: `## Kısa cevap: hedefe ve zemine bağlı

"Bu cihaz 3 metre iner" gibi ifadeler genellikle **büyük bir metal kütle** ve **ideal zemin** için geçerlidir. Sikke gibi küçük hedeflerde gerçekçi beklenti santimetrelerle ölçülür.

| Hedef | Hobi VLF / çok frekans | Büyük başlıklı PI |
|---|---|---|
| Küçük sikke | 15–30 cm | 20–40 cm |
| Büyük sikke, yüzük | 25–40 cm | 30–50 cm |
| Avuç büyüklüğünde metal | 40–70 cm | 60–100 cm |
| Büyük kütle (kova boyutu) | 1 m civarı | 1,5 m ve üzeri |

> Tablo saha deneyimine dayalı kabaca değerlerdir; zemin ve hedefin durumuna göre büyük farklar olabilir.

## Derinliği belirleyen 6 faktör

1. **Hedefin boyutu ve şekli:** Büyük ve düz yatan hedefler daha derinden alınır.
2. **Zemin minerali:** Demirli, tuzlu ya da sıcak taşlı zemin derinliği düşürür.
3. **Başlık çapı:** Büyük başlık daha derine iner ama küçük hedef hassasiyeti azalır.
4. **Frekans:** Düşük frekans büyük hedefte, yüksek frekans küçük hedefte avantajlıdır.
5. **Toprak dengeleme ve hassasiyet ayarı:** Yanlış ayar derinliği yarıya indirebilir.
6. **Hedefin toprakta kalma süresi:** Uzun süre gömülü metal, çevresine iz yaydığı için bazen daha iyi sinyal verir.

## Derinliği artırmak için

- Toprak dengelemeyi mutlaka yap.
- Hassasiyeti, cihaz kararlı kalacak en yüksek seviyeye getir.
- Kulaklık kullan; zayıf sinyaller hoparlörde kaybolur.
- Başlığı yere paralel ve yakın tut, yavaş sallayarak ara.`,
    faq: [
      { q: "En derine inen dedektör hangisi?", a: "Büyük hedefler için büyük başlıklı PI cihazlar ve görüntüleme sistemleri en derin sinyali verir. Küçük hedeflerde ise derinliği zemin ve ayarlar belirler." },
      { q: "Başlık değiştirmek derinliği artırır mı?", a: "Daha büyük başlık büyük hedeflerde derinliği artırır; ancak küçük hedef hassasiyeti ve çöp metal arasında ayrım azalır." },
    ],
    tags: ["derinlik", "ayarlar", "başlık"],
    productSkus: ["NOK-DH3D", "3510-0001", "3830-0001"],
    categorySlugs: ["derin-arama"],
    publishedAt: days(19),
  },
  {
    title: "Sahilde dedektörle arama: tuzlu kumda doğru cihaz ve ayarlar",
    slug: "sahilde-dedektorle-arama",
    category: "Kullanım ve ayarlar",
    excerpt: "Islak tuzlu kum neden sürekli öttürür? Sahil için cihaz seçimi, ayarlar ve en verimli arama saatleri.",
    answer:
      "Sahilde en iyi sonuç çok frekanslı veya PI dedektörle alınır, çünkü ıslak tuzlu kum tek frekanslı VLF cihazları sürekli öttürür. Cihazı sahil moduna al, toprak dengelemeyi ıslak kumda yap ve dalga çekildiğinde gelgit hattında ara. Su altına girilecekse gövdesi de su geçirmez bir model seç.",
    content: `## Neden sahil zordur?

Tuzlu su iletkendir. Islak kumdaki tuz, cihaza metal gibi görünür ve tek frekanslı cihazlarda **sürekli parazit** yaratır. Bu yüzden sahilde çok frekanslı veya PI teknolojisi tercih edilir.

## Sahil için cihaz seçerken

- **Çok frekanslı** (Multi-IQ, Multi-Flex, FMF) ya da **PI**
- **Su geçirmezlik:** Sadece kıyı için başlığı su geçirmez model yeterli; dalga içinde veya dalışta gövde de su geçirmez olmalı.
- **Hafiflik:** Kumda yürümek yorucudur, 1,5 kg altı tercih et.

## Önerilen ayarlar

1. **Sahil modunu seç.**
2. **Toprak dengelemeyi ıslak kumda yap**, kuru kumda değil.
3. Hassasiyeti cihaz kararlı kalana kadar düşür.
4. Demir ayrımını çok açma; küçük altın küpeler düşük ID verebilir.

## Nerede ve ne zaman aramalı?

- **Havlu bölgesi (kuru kum):** Akşam saatlerinde, gün boyu düşen takılar için.
- **Gelgit ve dalga hattı:** Ağır takılar burada birikir; dalga çekildiğinde ara.
- **Fırtına sonrası:** Kum kayar, eski hedefler yüzeye yaklaşır.

## Ekipman listesi

- Delikli sahil küreği (kepçe)
- Su geçirmez pinpointer
- Bulunanlar için ayrı kese

> Unutma: Bulduğun kayıp eşyaları sahibine ulaştırmak veya kolluğa teslim etmek yasal bir yükümlülüktür.`,
    faq: [
      { q: "Sahil için en iyi dedektör hangisi?", a: "Islak tuzlu kumda kararlı çalışan çok frekanslı veya PI cihazlar. Su altına girecekseniz gövdesi de su geçirmez bir model seçin." },
      { q: "VLF dedektörle sahilde arama yapılır mı?", a: "Kuru kumda yapılabilir; ıslak tuzlu kumda tek frekanslı VLF cihazlar genellikle kararsız çalışır ve sürekli öter." },
    ],
    tags: ["sahil", "su geçirmez", "çok frekans"],
    productSkus: ["3820-0009", "3720-0007", "XP-DEUS2-22", "GAR-PPAT"],
    categorySlugs: ["sahil-ve-su-alti"],
    publishedAt: days(12),
  },
  {
    title: "Orijinal dedektör nasıl anlaşılır? Seri no, fatura ve garanti kontrolü",
    slug: "orijinal-dedektor-nasil-anlasilir",
    category: "Rehber",
    excerpt: "Piyasada kopya ve garantisiz cihazlar var. Satın almadan önce kontrol etmen gereken 5 şey.",
    answer:
      "Orijinal dedektörü anlamak için cihazın seri numarasını yetkili distribütör kaydıyla sorgula, adına düzenlenmiş fatura iste ve garanti belgesinin Türkiye distribütörüne ait olduğunu kontrol et. Piyasa fiyatının çok altındaki, faturasız veya 'yurt dışından getirildi' denen cihazlar genellikle garantisizdir ya da kopyadır.",
    content: `## Satın almadan önce 5 kontrol

1. **Seri numarası:** Cihazın üzerindeki seri numarasını satıcıdan iste ve distribütör kaydında sorgula. Bulgu Dedektör'den aldığın cihazları [seri no sorgulama](/seri-no) sayfasından kontrol edebilirsin.
2. **Fatura:** Senin adına (veya şirketine) düzenlenmiş e-fatura ya da e-arşiv fatura olmalı.
3. **Garanti belgesi:** Türkiye distribütörüne ait, seri numarası işlenmiş garanti belgesi.
4. **Fiyat:** Piyasanın belirgin şekilde altındaki fiyat, kopya veya garantisiz cihaz işaretidir.
5. **Kutu içeriği:** Orijinal kutu, kılavuz ve aksesuarlar eksiksiz olmalı.

## Kopya cihazın riskleri

- Gerçek ayrım ve derinlik performansı yoktur.
- Yazılım güncellemesi alamaz.
- Arızada yetkili servis kabul etmez.
- Yeniden satış değeri yoktur.

## İkinci el alırken

- Satıcıdan orijinal faturayı ve garanti belgesini iste.
- Seri numarasını sorgula, garanti süresi devam ediyor mu bak.
- Cihazı sahada denemeden ödeme yapma.

> Bulgu Dedektör'deki tüm cihazlar yetkili distribütör ürünüdür, faturalı ve garantilidir.`,
    faq: [
      { q: "Yurt dışından alınan dedektörün garantisi geçerli mi?", a: "Genellikle Türkiye distribütörü garantisi kapsamına girmez. Arızada yurt dışına gönderim veya ücretli servis gerekebilir." },
      { q: "Seri numarasını nereden bulurum?", a: "Çoğu cihazda kontrol ünitesinin altında veya şase üzerinde etiket olarak bulunur; ayrıca kutuda ve garanti belgesinde yazar." },
    ],
    tags: ["orijinal", "seri no", "garanti"],
    productSkus: [],
    categorySlugs: [],
    publishedAt: days(6),
  },
];

const FAQS: (Omit<typeof t.faqs.$inferInsert, "categoryId"> & { categorySlug?: string })[] = [
  // Cihaz seçimi
  { group: "Cihaz seçimi", question: "Yeni başlayan için hangi dedektör alınmalı?", answer: "Hazır arama modları olan, 1,5 kg altı, başlığı su geçirmez bir VLF veya çok frekanslı cihaz idealdir. Tarla ve parkta sikke-takı için 12.000–35.000 TL bandı yeterlidir. Kararsızsan 6 soruluk seçim sihirbazımız sana uygun 3 modeli önerir.", showOnHome: true, sortOrder: 1 },
  { group: "Cihaz seçimi", question: "Dedektör kaç metreye iner?", answer: "Hobi dedektörleri normal toprakta sikke büyüklüğündeki hedefi genellikle 20–35 cm'de algılar. Büyük hedefler daha derinden alınır. Derinliği hedefin boyutu, zemin minerali, başlık çapı ve ayarlar belirler.", showOnHome: true, sortOrder: 2 },
  { group: "Cihaz seçimi", question: "Altın dedektörü ile normal dedektör arasındaki fark nedir?", answer: "Doğal altın dedektörleri küçük altın parçalarına hassas, yüksek frekanslı VLF veya mineralli zeminden az etkilenen PI cihazlardır. Normal (genel amaçlı) dedektörler sikke, takı ve karışık hedeflerde daha iyi ayrım yapar.", sortOrder: 3 },
  { group: "Cihaz seçimi", question: "Pinpointer gerekli mi?", answer: "Şart değil ama çok faydalı. Pinpointer kazdığın çukurda hedefin yerini saniyeler içinde gösterir, kazı süresini ve hedefe zarar verme riskini azaltır.", sortOrder: 4 },
  { group: "Cihaz seçimi", question: "Satın almadan önce cihazı deneyebilir miyim?", answer: "Evet. Showroomumuzda test alanında deneyebilir, uzmana görüntülü görüşmede cihazı gösterebilir veya bazı profesyonel modellerde deneme kiralaması yapabilirsin; kiralama bedeli 30 gün içinde satın alımda fiyattan düşülür.", sortOrder: 5 },
  // Yasal
  { group: "Yasal durum", question: "Türkiye'de dedektör kullanmak yasal mı?", answer: "Dedektör satın almak ve bulundurmak serbesttir. Define aramak ise 2863 sayılı Kanun ve Define Arama Yönetmeliği uyarınca Kültür ve Turizm Bakanlığından ruhsat alınmasını gerektirir; sit alanı, ören yeri ve mezarlıklarda arama yapılamaz.", showOnHome: true, sortOrder: 1 },
  { group: "Yasal durum", question: "Dedektör almak için izin veya belge gerekir mi?", answer: "Hayır. Metal dedektörü satın almak için izin gerekmez. Tüm cihazlarımız faturalı satılır.", sortOrder: 2 },
  // Sipariş ve ödeme
  { group: "Sipariş ve ödeme", question: "Taksitle dedektör alabilir miyim?", answer: "Evet. Kredi kartına 12 taksite kadar ödeme yapabilirsin; 3 taksite kadar vade farkı yoktur. Havale/EFT ile ödemede ek indirim uygulanır.", showOnHome: true, sortOrder: 1 },
  { group: "Sipariş ve ödeme", question: "Kart bilgilerim güvende mi?", answer: "Evet. Ödeme iyzico'nun güvenli sayfasında 3D Secure ile alınır; kart bilgilerin sitemizde saklanmaz.", sortOrder: 2 },
  { group: "Sipariş ve ödeme", question: "Fatura şirket adına kesilebilir mi?", answer: "Evet. Ödeme adımında kurumsal fatura seçip vergi bilgilerini girmen yeterli; e-fatura hesabına düşer.", sortOrder: 3 },
  // Kargo
  { group: "Kargo ve teslimat", question: "Siparişim ne zaman kargoya verilir?", answer: "Stokta olan ürünlerde saat 15:00'e kadar verilen siparişler aynı gün kargoya verilir. Tahmini teslim süresi 1–3 iş günüdür.", showOnHome: true, sortOrder: 1 },
  { group: "Kargo ve teslimat", question: "Kargo ücreti var mı?", answer: "Dedektör siparişlerinde kargo ücretsizdir. Güncel kargo koşulları sepet sayfasında gösterilir.", sortOrder: 2 },
  { group: "Kargo ve teslimat", question: "Siparişimi nasıl takip ederim?", answer: "Sipariş takip sayfasına sipariş numaranı ve e-postanı yazarak durumunu ve kargo takip numarasını görebilirsin. Üye isen hesabındaki 'Siparişlerim' bölümünde de görünür.", sortOrder: 3 },
  // Garanti
  { group: "Garanti ve servis", question: "Dedektörlerin garantisi ne kadar?", answer: "Cihazlarımız yetkili distribütör garantilidir; garanti süresi çoğu modelde 24 aydır ve ürün sayfasında yazar. Arızada hesabından servis kaydı açar, ücretsiz kargo koduyla gönderirsin.", showOnHome: true, sortOrder: 1 },
  { group: "Garanti ve servis", question: "Cihazımın orijinal olduğunu nasıl anlarım?", answer: "Seri numarasını sitemizdeki Seri No Sorgula sayfasına yaz. Kayıt, cihazın orijinal ve garantili olduğunu gösterir.", sortOrder: 2 },
  { group: "Garanti ve servis", question: "Satın aldıktan sonra kullanım eğitimi veriyor musunuz?", answer: "Evet. Kurulum ve temel ayarlar için ücretsiz görüntülü eğitim veriyoruz; showroomda yüz yüze eğitim de mümkün.", sortOrder: 3 },
  // İade
  { group: "İade", question: "Beğenmezsem iade edebilir miyim?", answer: "Evet. Teslimattan itibaren 14 gün içinde koşulsuz iade hakkın var. Hesabından tek tıkla iade talebi oluşturur, ücretsiz iade kargo koduyla gönderirsin.", sortOrder: 1 },
  // Kategori SSS
  { group: "Kategori", categorySlug: "sahil-ve-su-alti", question: "Sahilde hangi dedektör kullanılır?", answer: "Islak tuzlu kumda kararlı çalışan çok frekanslı veya PI dedektörler. Su altına girecekseniz gövdesi de su geçirmez bir model seçin.", sortOrder: 1 },
  { group: "Kategori", categorySlug: "sahil-ve-su-alti", question: "Su geçirmez dedektörle dalış yapılabilir mi?", answer: "Sadece 'tamamen su geçirmez' (dalış derinliği belirtilmiş) modellerle. 'Başlık su geçirmez' modellerde gövde suya girmemelidir.", sortOrder: 2 },
  { group: "Kategori", categorySlug: "dogal-altin", question: "Doğal altın aramak için hangi dedektör gerekir?", answer: "Küçük altın parçalarına hassas yüksek frekanslı VLF veya mineralli zeminden az etkilenen PI cihazlar. Çok mineralli sahalarda PI cihazlar genellikle daha derin sonuç verir.", sortOrder: 1 },
  { group: "Kategori", categorySlug: "define-ve-sikke", question: "Sikke aramak için en iyi dedektör hangisi?", answer: "İyi demir ayrımı olan VLF veya çok frekanslı cihazlar. Hedef ID numarası ve hazır modlar, çöp metal bol alanlarda zaman kazandırır.", sortOrder: 1 },
  { group: "Kategori", categorySlug: "derin-arama", question: "Görüntülü dedektör (3D) nasıl çalışır?", answer: "Alan taramasıyla toplanan sinyalleri yazılımla grafiğe dönüştürür; büyük ve derin metal kütleler ile boşlukların konumu hakkında fikir verir. Küçük hedefler için uygun değildir ve sonuçları yorumlamak deneyim ister.", sortOrder: 1 },
];

const GLOSSARY: [string, string][] = [
  ["Ayrım (Discrimination)", "Ayrım, dedektörün istenmeyen metalleri (çivi, folyo gibi) sesle bildirmemesini sağlayan ayardır. Ayrım arttıkça çöp metal azalır, ancak bazı küçük değerli hedefler de kaçabilir."],
  ["Toprak dengeleme (Ground balance)", "Toprak dengeleme, cihazın zemindeki mineralleri metal sanmasını önleyen ayardır. Mineralli ve tuzlu zeminde doğru yapılmazsa cihaz sürekli öter ve derinlik düşer."],
  ["VLF (Very Low Frequency)", "VLF, tek bir sabit frekansla çalışan dedektör teknolojisidir. Hafif ve uygun fiyatlıdır, demir ayrımı güçlüdür; ıslak tuzlu kumda zorlanır."],
  ["PI (Pulse Induction)", "PI, kısa elektromanyetik darbeler gönderip metaldeki sönümlenmeyi ölçen teknolojidir. Mineralli zemin ve tuzlu sudan az etkilenir, büyük ve derin hedeflerde güçlüdür; demir ayrımı zayıftır."],
  ["Çok frekans (Multi-frequency)", "Çok frekans, dedektörün birden fazla frekansı aynı anda kullanmasıdır. Farklı boyuttaki hedeflere ve zor zeminlere (sahil gibi) daha dengeli tepki verir."],
  ["Hedef ID", "Hedef ID, dedektörün algıladığı metale verdiği sayısal değerdir. Demir genellikle düşük, gümüş ve bakır yüksek değer verir; kesin tanımlama değil, tahmin aracıdır."],
  ["Pinpoint", "Pinpoint, hedefin tam merkezini bulmaya yarayan dedektör modudur. Kazı alanını küçültür ve gereksiz kazıyı azaltır."],
  ["Pinpointer", "Pinpointer, kazılan çukurda hedefi yerinde bulmak için kullanılan el tipi küçük dedektördür."],
  ["Hassasiyet (Sensitivity)", "Hassasiyet, dedektörün zayıf sinyallere tepki derecesidir. Yükseldikçe derinlik artar ama parazit de artar; cihazın kararlı kaldığı en yüksek seviye idealdir."],
  ["Başlık (Bobin, Coil)", "Başlık, sinyali gönderen ve alan dedektörün yere tutulan disk biçimli parçasıdır. Büyük başlık daha derine, küçük başlık çöp metal arasında daha iyi ayrıma yardım eder."],
  ["Çift D (DD) başlık", "Çift D başlık, iki D harfi biçiminde örtüşen bobinlerden oluşur. Mineralli zeminde kararlıdır ve geniş tarama alanı sağlar."],
  ["Konsantrik başlık", "Konsantrik başlık, iç içe iki halka bobinden oluşur. Hedefin yerini merkezde net gösterir; mineralli zeminde DD başlığa göre daha hassastır."],
  ["Mineralizasyon", "Mineralizasyon, toprağın demir oksit ve tuz gibi iletken veya manyetik mineraller içermesidir. Yüksek mineralizasyon derinliği azaltır ve yanlış sinyal üretir."],
  ["Sıcak taş (Hot rock)", "Sıcak taş, yüksek mineralli olduğu için dedektöre metal gibi sinyal veren taştır. Toprak dengeleme ve ayrım ayarlarıyla etkisi azaltılır."],
  ["Gürültü iptali (Noise cancel)", "Gürültü iptali, dedektörün çevredeki elektrik hatları veya diğer cihazlardan gelen paraziti azaltmak için çalışma kanalını değiştirmesidir."],
  ["Recovery hızı", "Recovery hızı, dedektörün bir hedeften sonra yeni hedefi algılamaya ne kadar hızlı hazır olduğudur. Çöp metal bol alanlarda yüksek recovery hızı yan yana hedefleri ayırmaya yardım eder."],
  ["Görüntüleme sistemi (3D)", "Görüntüleme sistemi, alan taramasıyla toplanan verileri yazılımla grafiğe dönüştüren derin arama cihazıdır. Büyük metal kütleleri ve boşlukları tespit etmeye yöneliktir."],
  ["Ruhsatname (Define arama ruhsatı)", "Ruhsatname, define aramak için Kültür ve Turizm Bakanlığından alınan resmi izin belgesidir. 2863 sayılı Kanun ve Define Arama Yönetmeliği'ne göre düzenlenir."],
];

const CATEGORY_CONTENT: Record<string, string> = {
  "define-ve-sikke": `## Define ve sikke için dedektör nasıl seçilir?

Tarla, bağ ve harabe aramalarında en önemli özellik **iyi demir ayrımıdır**. Bu alanlarda çivi ve demir parçası çok olur; iyi ayrım yapan cihaz zaman kazandırır.

- **Teknoloji:** VLF veya çok frekanslı
- **Ağırlık:** 1,5 kg altı, uzun aramalarda yormaz
- **Hedef ID ve ton sayısı:** Hedefleri sesle ayırmayı kolaylaştırır
- **Başlık:** 10–11" DD başlık hem derinlik hem ayrım için dengeli

## Bütçeye göre öneri

| Bütçe | Kime uygun |
|---|---|
| 12.000–25.000 TL | İlk cihaz, hafta sonu hobisi |
| 25.000–60.000 TL | Düzenli arama, su geçirmezlik isteyenler |
| 60.000 TL üzeri | Profesyonel, zor zemin |

> Hatırlatma: Define aramak için Kültür ve Turizm Bakanlığından ruhsat gerekir. Ayrıntılar için [mevzuat rehberimizi](/blog/turkiyede-dedektor-kullanmak-yasal-mi) oku.`,
  "sahil-ve-su-alti": `## Sahilde neden özel dedektör gerekir?

Islak tuzlu kum iletkendir ve tek frekanslı cihazları sürekli öttürür. Bu kategorideki cihazlar **çok frekanslı** veya **sahil modu** olan, en az başlığı su geçirmez modellerdir.

## Su geçirmezlik seviyeleri

| Seviye | Ne yapabilirsin |
|---|---|
| Sadece başlık | Islak kum, sığ su kenarı |
| Tamamen (3–5 m) | Dalga içinde, şnorkel |
| Dalış (10–20 m+) | Tüplü dalış |

Ayrıntılı ayarlar için [sahil rehberimize](/blog/sahilde-dedektorle-arama) göz at.`,
  "dogal-altin": `## Doğal altın için dedektör seçimi

Doğal altın genellikle küçük parçalar hâlinde ve **yüksek mineralli** zeminde bulunur. Bu yüzden iki tür cihaz öne çıkar:

- **Yüksek frekanslı VLF (40 kHz ve üzeri):** Çok küçük altına hassas, hafif, daha uygun fiyatlı.
- **PI (Pulse Induction):** Mineralli zeminden az etkilenir, daha büyük parçaları daha derinden alır.

Bu sınıftaki cihazlar deneyim ister; satın alma sonrası ücretsiz kurulum eğitimimizden yararlanabilirsin.`,
};

export async function seedContent() {
  const prods = await db.select({ id: t.products.id, sku: t.products.sku }).from(t.products);
  const cats = await db.select({ id: t.categories.id, slug: t.categories.slug, seoContent: t.categories.seoContent }).from(t.categories);
  const pid = (skus: string[] = []) => prods.filter((p) => skus.includes(p.sku)).map((p) => p.id);
  const cid = (slugs: string[] = []) => cats.filter((c) => slugs.includes(c.slug)).map((c) => c.id);

  const existing = new Set((await db.select({ slug: t.posts.slug }).from(t.posts)).map((p) => p.slug));
  let nPosts = 0;
  for (const p of POSTS) {
    if (existing.has(p.slug)) continue;
    const { productSkus, categorySlugs, ...rest } = p;
    await db.insert(t.posts).values({ ...AUTHOR, ...rest, status: "PUBLISHED", relatedProductIds: pid(productSkus), relatedCategoryIds: cid(categorySlugs), updatedAt: rest.publishedAt ?? new Date() });
    nPosts++;
  }

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(t.faqs);
  let nFaq = 0;
  if (!n) {
    const rows = [
      ...FAQS.map(({ categorySlug, ...f }) => ({ ...f, kind: "FAQ" as const, categoryId: categorySlug ? (cid([categorySlug])[0] ?? null) : null })).filter((f) => !(f.group === "Kategori" && !f.categoryId)),
      ...GLOSSARY.map(([q, a], i) => ({ kind: "GLOSSARY" as const, question: q, answer: a, group: "Sözlük", sortOrder: i })),
    ];
    await db.insert(t.faqs).values(rows);
    nFaq = rows.length;
  }

  let nCat = 0;
  for (const [slug, content] of Object.entries(CATEGORY_CONTENT)) {
    const c = cats.find((x) => x.slug === slug);
    if (c && !c.seoContent) {
      await db.update(t.categories).set({ seoContent: content }).where(eq(t.categories.id, c.id));
      nCat++;
    }
  }

  // Header menüsüne "Rehberler" (yoksa)
  const hasMenu = await db.select({ id: t.menuItems.id }).from(t.menuItems).where(inArray(t.menuItems.url, ["/blog"]));
  if (!hasMenu.length) await db.insert(t.menuItems).values({ location: "HEADER", label: "Rehberler", url: "/blog", sortOrder: 7 });

  console.log(`İçerik: ${nPosts} yazı, ${nFaq} SSS/sözlük kaydı, ${nCat} kategori metni eklendi.`);
}

if (process.argv[1]?.includes("seed-content")) {
  seedContent()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
