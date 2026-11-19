/**
 * Demo mağazanın İngilizce içeriği (ürün, kategori, marka, menü, sayfa, SSS/sözlük, ana sayfa, banner, kampanya, duyuru).
 * Kayıtlar Türkçe slug / metin ile eşleştirilir; seed sonunda `translations` tablosuna yazılır.
 * Gerçek mağazada bu çeviriler panelden (her kaydın "İngilizce" sekmesi) girilir.
 */

type Spec = { key: string; value: string };
export type EnProduct = {
  name?: string;
  slug?: string;
  shortDescription: string;
  seoTitle: string;
  seoDescription: string;
  specs?: Spec[];
  idealFor?: string[];
  notFor?: string[];
  boxContents?: string[];
  badges?: string[];
};

export const EN_PRODUCTS: Record<string, EnProduct> = {
  "vanquish-560-pro-pack": {
    shortDescription: "Switch on and go: 4 preset modes, Multi-IQ multi-frequency, two waterproof coils and wireless headphones in one pack.",
    seoTitle: "Minelab Vanquish 560 Pro-Pack Metal Detector",
    seoDescription: "Minelab Vanquish 560 Pro-Pack: Multi-IQ multi-frequency, 4 search modes, two waterproof coils and ML60 wireless headphones. Ideal first detector.",
    badges: ["Best seller"],
    specs: [
      { key: "Frequency", value: "Multi-IQ (simultaneous multi-frequency)" },
      { key: "Weight", value: "1.26 kg" },
      { key: "Length", value: "79 cm folded · 142 cm extended" },
      { key: "Waterproofing", value: "Coil IP68" },
      { key: "Sensitivity", value: "10 levels" },
      { key: "Target tones", value: "5 tones" },
    ],
    idealFor: [
      "Park, field and beach modes let you start searching straight away",
      "Coil is waterproof to 1 metre",
      "Lag-free audio with the wireless headphones",
      "Pinpoint mode finds the centre of the target",
    ],
    notFor: ["Not made for very deep, large targets", "The control box can't go under water"],
    boxContents: [
      "Control unit and shaft",
      "V12X 12×9\" coil + cover",
      "V8X 8×5\" coil + cover",
      "ML60 wireless headphones",
      "Magnetic charging cable",
      "Manual and warranty card",
    ],
  },
  "deus-ii-22-cm-ws6-kulaklik": {
    name: "Deus II 22 cm · WS6 Headphones",
    slug: "deus-ii-22-cm-ws6-headphones",
    shortDescription: "Fully wireless, waterproof to 20 m, professional multi-frequency detector.",
    seoTitle: "XP Deus II 22 cm with WS6 Headphones",
    seoDescription: "XP Deus II with 22 cm coil and WS6 headphones: fully wireless, FMF multi-frequency, waterproof to 20 m, only 750 g.",
    specs: [
      { key: "Frequency", value: "FMF multi-frequency + 6 single frequencies" },
      { key: "Weight", value: "750 g" },
      { key: "Waterproofing", value: "20 m" },
    ],
  },
  "ace-250": {
    shortDescription: "A classic first detector: simple menu, reliable discrimination.",
    seoTitle: "Garrett Ace 250 Metal Detector",
    seoDescription: "Garrett Ace 250: an easy, reliable beginner metal detector with simple controls, target ID and dependable iron discrimination.",
    specs: [
      { key: "Frequency", value: "6.5 kHz" },
      { key: "Weight", value: "1.2 kg" },
    ],
  },
  "double-score-2": {
    shortDescription: "Dual-frequency and fully waterproof, made in Turkey.",
    seoTitle: "Nokta Double Score 2 Metal Detector",
    seoDescription: "Nokta Double Score 2: dual-frequency, fully waterproof detector for coins, relics and gold. Built by Turkish manufacturer Nokta.",
  },
  "equinox-900": {
    shortDescription: "One detector for land, beach and underwater: Multi-IQ+, waterproof to 5 m.",
    seoTitle: "Minelab Equinox 900 Metal Detector",
    seoDescription: "Minelab Equinox 900: Multi-IQ+ multi-frequency for land, beach and underwater, waterproof to 5 m. One detector for every terrain.",
  },
  "eqx-11-baslik": {
    name: "EQX 11 Coil",
    slug: "eqx-11-coil",
    shortDescription: "11\" Double-D search coil compatible with the Equinox series.",
    seoTitle: "Minelab EQX 11 Double-D Search Coil",
    seoDescription: "Minelab EQX 11 11-inch Double-D coil for Equinox detectors: the balanced choice for depth and ground coverage.",
  },
  "x-terra-pro": {
    shortDescription: "Selectable frequencies, fully waterproof and good value.",
    seoTitle: "Minelab X-Terra Pro Metal Detector",
    seoDescription: "Minelab X-Terra Pro: selectable-frequency, fully waterproof detector for coins, relics, beach and gold. Great value.",
    notFor: ["Runs on one frequency at a time"],
  },
  "apex-raider-paket": {
    name: "Apex Raider Bundle",
    slug: "apex-raider-bundle",
    shortDescription: "Garrett Apex with the Raider coil: Multi-Flex frequency in a light, beginner-friendly bundle.",
    seoTitle: "Garrett Apex Raider Bundle Metal Detector",
    seoDescription: "Garrett Apex Raider bundle: Multi-Flex multi-frequency, Raider coil and wireless audio. Light and easy for new detectorists.",
  },
  "deephunter-pro-3d": {
    shortDescription: "Ground imaging system that turns scans into 3D graphs of large, deep targets and cavities.",
    seoTitle: "Nokta Deephunter Pro 3D Ground Imaging System",
    seoDescription: "Nokta Deephunter Pro 3D: ground imaging system for large, deep metal masses and cavities, with 3D graphs on screen.",
  },
  "findx-pro": {
    shortDescription: "Light, fully waterproof entry-level detector at an easy price.",
    seoTitle: "Nokta FindX Pro Metal Detector",
    seoDescription: "Nokta FindX Pro: light, fully waterproof entry-level detector for parks, fields and beaches at a beginner-friendly price.",
  },
  "go-find-66": {
    shortDescription: "Foldable, ultra-light detector for families and casual hunts.",
    seoTitle: "Minelab Go-Find 66 Metal Detector",
    seoDescription: "Minelab Go-Find 66: foldable, ultra-light metal detector with simple controls, ideal for families and casual detecting.",
  },
  "gold-monster-2000": {
    shortDescription: "PI gold detector built for mineralised ground and small nuggets.",
    seoTitle: "Minelab Gold Monster 2000 Gold Detector",
    seoDescription: "Minelab Gold Monster 2000: pulse induction gold detector that stays stable in highly mineralised ground. For serious prospectors.",
  },
  "gpx-6000": {
    shortDescription: "Professional PI gold detector: deep and sensitive to small nuggets even in tough ground.",
    seoTitle: "Minelab GPX 6000 Gold Detector",
    seoDescription: "Minelab GPX 6000: professional pulse induction gold detector, sensitive to small nuggets and deep in mineralised ground.",
  },
  "gpz-8000": {
    shortDescription: "Flagship ZVT gold detector for maximum depth in heavily mineralised ground.",
    seoTitle: "Minelab GPZ 8000 Gold Detector",
    seoDescription: "Minelab GPZ 8000: ZVT technology for maximum depth on gold, even in heavily mineralised ground. The flagship for prospectors.",
  },
  manticore: {
    shortDescription: "Minelab's most powerful multi-frequency detector for coins and relics: ultra-high power, 2D target ID.",
    seoTitle: "Minelab Manticore Metal Detector",
    seoDescription: "Minelab Manticore: ultra-high-power Multi-IQ+ detector with 2D target ID, fully waterproof. The new level for coin and relic hunting.",
    badges: ["New"],
  },
  "pro-pointer-at": {
    shortDescription: "Find the target in the hole in seconds. Waterproof to 3 m.",
    seoTitle: "Garrett Pro-Pointer AT Pinpointer",
    seoDescription: "Garrett Pro-Pointer AT: waterproof to 3 m, finds the target in the hole in seconds. The most popular pinpointer.",
  },
  "vortex-vx9": {
    shortDescription: "Garrett's fully waterproof multi-frequency flagship for land and water.",
    seoTitle: "Garrett Vortex VX9 Metal Detector",
    seoDescription: "Garrett Vortex VX9: fully waterproof multi-frequency detector for land, beach and underwater, with wireless audio.",
  },
};

export const EN_CATEGORIES: Record<string, { name: string; slug: string; shortText: string; description: string; seoTitle: string; seoDescription: string; seoContent?: string }> = {
  "define-ve-sikke": {
    name: "Coins and relics",
    slug: "coins-and-relics",
    shortText: "Fields, vineyards, ruins",
    description: "Detectors with strong discrimination for coins, jewellery and buried metal.",
    seoTitle: "Metal Detectors for Coins and Relics",
    seoDescription: "Metal detectors for coin and relic hunting with strong iron discrimination: VLF and multi-frequency models from Minelab, Garrett, Nokta and XP.",
    seoContent: `## How to choose a detector for coins and relics

In fields, vineyards and ruins the most important feature is **good iron discrimination**. These sites are full of nails and iron scraps; a detector that discriminates well saves you time.

- **Technology:** VLF or multi-frequency
- **Weight:** under 1.5 kg, so long hunts don't tire you
- **Target ID and tones:** make it easier to tell targets apart by sound
- **Coil:** a 10–11" DD coil balances depth and separation

## Recommendations by budget

| Budget | Who it suits |
|---|---|
| 12,000–25,000 TL | First detector, weekend hobby |
| 25,000–60,000 TL | Regular hunting, waterproofing |
| Over 60,000 TL | Professional use, difficult ground |

> Note: Check local laws before you search. Many countries require permission from the landowner or the authorities, and protected sites are always off-limits.`,
  },
  "dogal-altin": {
    name: "Gold prospecting",
    slug: "gold-prospecting",
    shortText: "Nuggets, goldfields",
    description: "Detectors sensitive to small natural gold in mineralised ground.",
    seoTitle: "Gold Detectors for Prospecting",
    seoDescription: "Gold detectors for nuggets in mineralised ground: high-frequency VLF and pulse induction (PI) models from Minelab and Nokta.",
    seoContent: `## Choosing a detector for natural gold

Natural gold is usually found in small pieces in **highly mineralised** ground, so two types of detector stand out:

- **High-frequency VLF (40 kHz and above):** sensitive to very small gold, light and more affordable.
- **PI (pulse induction):** barely affected by mineralised ground and picks up larger pieces from deeper.

Detectors in this class take experience; you can use our free setup training after you buy.`,
  },
  "sahil-ve-su-alti": {
    name: "Beach and underwater",
    slug: "beach-and-underwater",
    shortText: "Lost jewellery, diving",
    description: "Wet salty sand makes ordinary detectors chatter constantly. The models here are multi-frequency or have a beach mode, and are at least partly waterproof.",
    seoTitle: "Beach and Underwater Metal Detectors",
    seoDescription: "Waterproof metal detectors for beach and underwater hunting: multi-frequency and PI models that stay stable on wet salty sand.",
    seoContent: `## Why the beach needs a special detector

Wet salty sand is conductive and makes single-frequency detectors beep constantly. The detectors in this category are **multi-frequency** or have a **beach mode**, with at least a waterproof coil.

## Waterproofing levels

| Level | What you can do |
|---|---|
| Coil only | Wet sand, shallow water's edge |
| Fully waterproof (3–5 m) | In the waves, snorkelling |
| Diving (10–20 m+) | Scuba diving |`,
  },
  "derin-arama": {
    name: "Deep search",
    slug: "deep-search",
    shortText: "Imaging, 3D",
    description: "Imaging systems and large-coil detectors for big, deep targets.",
    seoTitle: "Deep Search Metal Detectors and Ground Imaging",
    seoDescription: "Deep search detectors and 3D ground imaging systems for large, deep metal targets and cavities.",
  },
  pointer: {
    name: "Pinpointers",
    slug: "pinpointers",
    shortText: "Pinpointing",
    description: "Handheld detectors that find the target in the hole within seconds.",
    seoTitle: "Pinpointers",
    seoDescription: "Waterproof pinpointers from Garrett, Minelab and Nokta: find the target in the hole in seconds and dig less.",
  },
  "baslik-ve-aksesuar": {
    name: "Coils and accessories",
    slug: "coils-and-accessories",
    shortText: "Coils, headphones, batteries",
    description: "Coils, headphones and batteries compatible with your detector.",
    seoTitle: "Metal Detector Coils and Accessories",
    seoDescription: "Search coils, headphones, batteries and accessories for Minelab, Garrett, Nokta and XP metal detectors.",
  },
};

export const EN_BRANDS: Record<string, string> = {
  minelab: "Based in Australia; Multi-IQ and PI technologies.",
  garrett: "Based in the USA; Ace, AT and Vortex series.",
  nokta: "Turkish manufacturer; Double Score, FindX and ground imaging systems.",
  xp: "French manufacturer; Deus series wireless detectors.",
};

/** Menü: Türkçe etiket → İngilizce */
export const EN_MENU: Record<string, string> = {
  "Sipariş takibi": "Order tracking",
  "İade talebi": "Return request",
  "Servis kaydı": "Service request",
  "Seri no sorgula": "Serial number check",
  İletişim: "Contact",
  "Define Dedektörü": "Coin & Relic Detectors",
  "Altın Dedektörü": "Gold Detectors",
  Sualtı: "Underwater",
  "Başlık ve Aksesuar": "Coils & Accessories",
  Pointer: "Pinpointers",
  Kampanyalar: "Deals",
  Hakkımızda: "About us",
  Yardım: "Help",
  Blog: "Blog",
};

/** Sayfalar: slug → { title, slug, content? } — içerik yoksa Türkçe metin "bağlayıcı sürüm Türkçedir" notuyla gösterilir */
export const EN_PAGES: Record<string, { title: string; slug: string; content?: string }> = {
  "mesafeli-satis-sozlesmesi": { title: "Distance sales agreement", slug: "distance-sales-agreement" },
  "on-bilgilendirme-formu": { title: "Pre-contract information form", slug: "pre-contract-information" },
  "kvkk-aydinlatma-metni": { title: "Privacy notice (KVKK)", slug: "privacy-notice" },
  "cerez-politikasi": { title: "Cookie policy", slug: "cookie-policy" },
  "uyelik-sozlesmesi": { title: "Membership agreement", slug: "membership-agreement" },
  "gizlilik-ve-guvenlik": { title: "Privacy and security", slug: "privacy-and-security" },
  hakkimizda: {
    title: "About us",
    slug: "about-us",
    content: `<p><strong>Derinova Dedektör</strong> is a store specialising in metal detectors and accessories. We sell Minelab, Nokta, XP, Garrett and CoilTek products that are genuine, invoiced and covered by warranty.</p>
<h2>Why Derinova?</h2>
<ul>
<li><strong>Guaranteed genuine:</strong> every detector comes with an invoice and warranty, and you can verify it by serial number.</li>
<li><strong>Expert advice:</strong> we help you choose the right detector for what you're looking for and where you search, by phone, WhatsApp or in our showroom.</li>
<li><strong>After-sales support:</strong> setup and usage training, spare parts and technical service.</li>
</ul>
<h2>Showroom</h2>
<p>{{adres}}<br>Phone: {{telefon}} · WhatsApp: {{whatsapp}} · {{eposta}}</p>`,
  },
  "odeme-ve-teslimat": {
    title: "Payment and delivery",
    slug: "payment-and-delivery",
    content: `<h2>Payment options</h2>
<ul>
<li><strong>Credit / debit card:</strong> single payment or up to {{taksit}} instalments. Up to {{vade_farksiz}} instalments are interest-free (instalments are available on cards issued in Turkey); see the "Instalment options" table on the product page for rates.</li>
<li><strong>Bank transfer:</strong> after ordering, pay into one of the accounts below and send a "Payment notification" from your order page. Remember to include your order number in the reference.</li>
<li><strong>Pay in store:</strong> cash or card at our showroom.</li>
</ul>
<h3>Our bank accounts</h3>
{{banka_hesaplari}}
<p>Account holder: {{unvan}}</p>
<h2>Delivery</h2>
<p>In-stock items ship the same day or within 3 business days of payment approval. Your tracking number is sent by email and shown on your order page. We currently deliver to addresses in Turkey; for international orders, contact us on WhatsApp first. You can also collect your order from our showroom: {{adres}}.</p>
<p>Check the parcel when it arrives; if it is damaged, ask the courier to record it in a damage report.</p>`,
  },
  "iade-ve-degisim": {
    title: "Returns, exchanges and warranty",
    slug: "returns-and-exchanges",
    content: `<h2>14-day no-questions-asked returns</h2>
<p>You can return the product within <strong>14 days</strong> of delivery without giving a reason (Turkish Consumer Protection Law No. 6502 and the Distance Contracts Regulation).</p>
<h3>How do I return an item?</h3>
<ol>
<li>If you have an account, create a "Return request" under <a href="/en/account">My account → My orders</a>. If you checked out as a guest, email {{eposta}} with your order number or call {{telefon}}.</li>
<li>Pack the product with its invoice, all accessories and the original box.</li>
<li>Send it within 10 days using the courier code we give you. We pay the shipping on returns sent with our partner courier.</li>
</ol>
<p>Once the product reaches us and is checked, we refund it to your original payment method within 14 days. For card payments, how long the refund takes to appear depends on your bank.</p>
<h3>Loss of value</h3>
<p>Unboxing, assembling and trying the detector doesn't stop you returning it. However, we may deduct for loss of value caused by field use, such as scratches, breakage, or mud or water damage.</p>
<h2>Exchanges</h2>
<p>To swap for a different model, create a return request within 14 days and place a new order, or call us and we'll handle the exchange in one go; any price difference is charged or refunded.</p>
<h2>Warranty and technical service</h2>
<p>All detectors come with an invoice and at least a <strong>2-year</strong> warranty. Your rights to repair, replacement or refund for faults covered by warranty are protected under Law No. 6502. To report a fault, create a <a href="/en/service">service request</a>; you can check that your product is genuine on the <a href="/en/serial-check">serial number check</a> page.</p>
<p>Misuse, impact damage, unauthorised repairs and use against the manual (for example, submerging a control box that isn't waterproof) are not covered by the warranty.</p>
<h2>Damaged delivery</h2>
<p>If the parcel is damaged, ask the courier to record it in a damage report before you accept it and let us know the same day; we'll replace the product free of charge.</p>`,
  },
};

/** SSS ve sözlük: Türkçe soru → İngilizce soru, cevap, grup */
const G: Record<string, string> = {
  Sözlük: "Glossary",
  "Cihaz seçimi": "Choosing a detector",
  "Yasal durum": "Legal",
  "Sipariş ve ödeme": "Orders and payment",
  "Kargo ve teslimat": "Shipping and delivery",
  "Garanti ve servis": "Warranty and service",
  İade: "Returns",
  Kategori: "Category",
  Genel: "General",
};
export const EN_FAQ_GROUPS = G;

export const EN_FAQS: Record<string, [string, string]> = {
  "Ayrım (Discrimination)": ["Discrimination", "Discrimination is the setting that stops the detector signalling unwanted metals such as nails and foil. More discrimination means less junk, but some small valuable targets can be missed."],
  "Yeni başlayan için hangi dedektör alınmalı?": ["Which detector should a beginner buy?", "A VLF or multi-frequency detector with preset search modes, under 1.5 kg and with a waterproof coil is ideal. For coins and jewellery in fields and parks, 12,000–35,000 TL is enough. If you're unsure, our 6-question finder recommends 3 models that suit you."],
  "Türkiye'de dedektör kullanmak yasal mı?": ["Is it legal to use a metal detector in Turkey?", "Buying and owning a detector is legal. Treasure hunting, however, requires a licence from the Ministry of Culture and Tourism under Law No. 2863 and the Treasure Hunting Regulation; searching is not allowed at protected sites, archaeological sites or cemeteries. Outside Turkey, check your local laws."],
  "Taksitle dedektör alabilir miyim?": ["Can I pay in instalments?", "Yes. With credit cards issued in Turkey you can pay in up to 12 instalments; up to 3 instalments are interest-free. Bank transfer payments get an extra discount."],
  "Siparişim ne zaman kargoya verilir?": ["When will my order ship?", "In-stock orders placed by 3 pm ship the same day. Estimated delivery is 1–3 business days within Turkey."],
  "Dedektörlerin garantisi ne kadar?": ["How long is the warranty?", "Our detectors are covered by the authorised distributor's warranty; on most models it's 24 months and it's shown on the product page. If something goes wrong, open a service request from your account and send it with a free shipping code."],
  "Beğenmezsem iade edebilir miyim?": ["Can I return it if I don't like it?", "Yes. You have 14 days from delivery to return it, no questions asked. Create a return request from your account in one click and send it with a free return shipping code."],
  "Sahilde hangi dedektör kullanılır?": ["Which detector works on the beach?", "Multi-frequency or PI detectors that stay stable on wet salty sand. If you'll go into the water, choose a model whose control box is waterproof too."],
  "Doğal altın aramak için hangi dedektör gerekir?": ["Which detector do I need for gold prospecting?", "High-frequency VLF detectors sensitive to small gold, or PI detectors that are barely affected by mineralised ground. On highly mineralised goldfields, PI detectors usually go deeper."],
  "Sikke aramak için en iyi dedektör hangisi?": ["What's the best detector for coins?", "VLF or multi-frequency detectors with good iron discrimination. Target ID and preset modes save time on junk-heavy sites."],
  "Görüntülü dedektör (3D) nasıl çalışır?": ["How does a 3D imaging detector work?", "It turns the signals collected while scanning an area into a graph with software, giving an idea of where large, deep metal masses and cavities are. It isn't suited to small targets and reading the results takes experience."],
  "Toprak dengeleme (Ground balance)": ["Ground balance", "Ground balance is the setting that stops the detector mistaking minerals in the soil for metal. If it isn't set correctly on mineralised or salty ground, the detector beeps constantly and loses depth."],
  "VLF (Very Low Frequency)": ["VLF (Very Low Frequency)", "VLF is detector technology that runs on a single fixed frequency. It's light and affordable with strong iron discrimination, but struggles on wet salty sand."],
  "Dedektör kaç metreye iner?": ["How deep can a metal detector go?", "Hobby detectors usually detect a coin-sized target at 20–35 cm in normal soil. Larger targets are detected deeper. Depth depends on target size, ground mineralisation, coil size and settings."],
  "Cihazımın orijinal olduğunu nasıl anlarım?": ["How do I know my detector is genuine?", "Enter its serial number on our Serial Number Check page. A matching record shows the detector is genuine and under warranty."],
  "Kargo ücreti var mı?": ["Is there a shipping fee?", "Shipping is free on detector orders. Current shipping terms are shown in your cart."],
  "Kart bilgilerim güvende mi?": ["Are my card details safe?", "Yes. Payment is taken on the payment provider's secure page with 3D Secure; your card details are never stored on our site."],
  "Dedektör almak için izin veya belge gerekir mi?": ["Do I need a permit to buy a detector?", "No. You don't need a permit to buy a metal detector. All our detectors are sold with an invoice."],
  "Su geçirmez dedektörle dalış yapılabilir mi?": ["Can I dive with a waterproof detector?", "Only with 'fully waterproof' models that state a diving depth. On 'waterproof coil' models the control box must not go under water."],
  "Siparişimi nasıl takip ederim?": ["How do I track my order?", "Enter your order number and email on the order tracking page to see its status and tracking number. If you have an account, it also appears under 'My orders'."],
  "Satın aldıktan sonra kullanım eğitimi veriyor musunuz?": ["Do you offer training after purchase?", "Yes. We offer free video training for setup and basic settings; face-to-face training at our showroom is also possible."],
  "PI (Pulse Induction)": ["PI (Pulse Induction)", "PI sends short electromagnetic pulses and measures how they decay in metal. It's barely affected by mineralised ground and salt water and is strong on large, deep targets, but its iron discrimination is weak."],
  "Altın dedektörü ile normal dedektör arasındaki fark nedir?": ["What's the difference between a gold detector and a regular detector?", "Gold detectors are high-frequency VLF detectors sensitive to small gold, or PI detectors that are barely affected by mineralised ground. Regular (general-purpose) detectors discriminate better on coins, jewellery and mixed targets."],
  "Fatura şirket adına kesilebilir mi?": ["Can the invoice be in my company's name?", "Yes. Choose a company invoice at checkout and enter your tax details; the e-invoice is sent to your account."],
  "Çok frekans (Multi-frequency)": ["Multi-frequency", "Multi-frequency means the detector uses several frequencies at once. It responds more evenly to targets of different sizes and to difficult ground such as the beach."],
  "Pinpointer gerekli mi?": ["Do I need a pinpointer?", "Not essential, but very useful. A pinpointer shows where the target is in the hole within seconds, cutting digging time and the risk of damaging the find."],
  "Hangi cihazın bana uygun olduğunu nasıl anlarım?": ["How do I know which detector suits me?", "Try our 6-question finder or message our expert on WhatsApp; we'll recommend the best models for your search area, targets and budget, with reasons."],
  "Hedef ID": ["Target ID", "Target ID is the number the detector gives the metal it detects. Iron usually reads low, silver and copper high; it's an estimate, not a definite identification."],
  Pinpoint: ["Pinpoint", "Pinpoint is the detector mode that finds the exact centre of the target. It narrows the dig area and cuts unnecessary digging."],
  Pinpointer: ["Pinpointer", "A pinpointer is a small handheld detector used to locate the target inside the hole you've dug."],
  "Hassasiyet (Sensitivity)": ["Sensitivity", "Sensitivity is how strongly the detector responds to weak signals. Higher sensitivity adds depth but also noise; the ideal is the highest level at which the detector stays stable."],
  "Başlık (Bobin, Coil)": ["Search coil", "The search coil is the disc-shaped part held near the ground that sends and receives the signal. A large coil goes deeper; a small coil separates targets better among junk."],
  "Çift D (DD) başlık": ["Double-D (DD) coil", "A Double-D coil has two overlapping windings shaped like the letter D. It's stable on mineralised ground and covers a wide area."],
  "Konsantrik başlık": ["Concentric coil", "A concentric coil has two ring-shaped windings, one inside the other. It pinpoints the target clearly at the centre and is more sensitive than a DD coil, but less stable on mineralised ground."],
  Mineralizasyon: ["Mineralisation", "Mineralisation means the soil contains conductive or magnetic minerals such as iron oxides and salts. High mineralisation reduces depth and causes false signals."],
  "Sıcak taş (Hot rock)": ["Hot rock", "A hot rock is a stone so highly mineralised that the detector signals it like metal. Ground balance and discrimination settings reduce the effect."],
  "Gürültü iptali (Noise cancel)": ["Noise cancel", "Noise cancel switches the detector's operating channel to reduce interference from power lines or other detectors nearby."],
  "Recovery hızı": ["Recovery speed", "Recovery speed is how quickly the detector is ready to detect a new target after the previous one. On junk-heavy sites, fast recovery helps separate targets lying side by side."],
  "Görüntüleme sistemi (3D)": ["Ground imaging system (3D)", "A ground imaging system is a deep search device that turns scan data into graphs with software. It's designed to detect large metal masses and cavities."],
  "Ruhsatname (Define arama ruhsatı)": ["Treasure hunting licence (Turkey)", "In Turkey, a treasure hunting licence is the official permit issued by the Ministry of Culture and Tourism. It is governed by Law No. 2863 and the Treasure Hunting Regulation."],
};

/** Ana sayfa bölümleri: Türkçe başlık → [başlık, alt başlık] */
export const EN_SECTIONS: Record<string, [string, string]> = {
  "Ne arıyorsun?": ["What are you looking for?", "Pick one and leave the rest to us."],
  "Hangi dedektörü alacağını bilmiyor musun?": ["Not sure which detector to buy?", "6 quick questions, about a minute. We'll show you 3 detectors that suit you, with reasons."],
  "Çok satanlar": ["Best sellers", ""],
  "Markaya göre alışveriş": ["Shop by brand", "Pick your brand and browse its models by category"],
  "Kararsız mı kaldın? Bir uzmana sor.": ["Can't decide? Ask an expert.", ""],
  "Profesyonel ve derin arama": ["Professional and deep search", ""],
  "Kategorilere göre": ["By category", ""],
};

/** Banner / promosyon kartları: Türkçe başlık → İngilizce alanlar */
export const EN_BANNERS: Record<string, { title: string; subtitle?: string; eyebrow?: string }> = {
  "Minelab Manticore: define aramada yeni seviye": { title: "Minelab Manticore: the next level in coin and relic hunting", subtitle: "Coin & relic detector" },
  "Minelab GPZ 8000: mineralli toprakta bile derinde": { title: "Minelab GPZ 8000: deep even in mineralised ground", subtitle: "Gold detector" },
  "Minelab Equinox 900: tarla, plaj, su altı": { title: "Minelab Equinox 900: fields, beach, underwater", subtitle: "All-terrain, waterproof" },
  "Vanquish 560 Pro-Pack": { title: "Vanquish 560 Pro-Pack", subtitle: "From 49,588 TL", eyebrow: "NEW · MINELAB" },
  "Equinox 900, 3 taksit": { title: "Equinox 900 in 3 instalments", subtitle: "3 × 33,227 TL", eyebrow: "INTEREST-FREE · MINELAB" },
  "Kazıda hedefi saniyede bul": { title: "Find the target in seconds", subtitle: "From 12,751 TL", eyebrow: "PINPOINTER · GARRETT" },
};

export const EN_CAMPAIGNS: Record<string, [string, string]> = {
  "Hoş geldin indirimi": ["Welcome discount", "5% off your first order, up to 3,000 TL"],
  "Pointer'da kargo bedava": ["Free shipping on pinpointers", "Free shipping on pinpointer orders"],
  "Minelab sezon indirimi": ["Minelab season sale", "1,500 TL off Minelab orders over 40,000 TL"],
};

export const EN_BUNDLES: Record<string, [string, string]> = {
  "Manticore + Pro-Pointer AT seti": ["Manticore + Pro-Pointer AT set", "The detector finds the target and the pinpointer shows exactly where it is in the hole. Save 8% when you buy them together."],
  "Vanquish başlangıç seti": ["Vanquish starter set", "Get your first detector together with a pinpointer and dig faster."],
};

/** Tek metinler (localizeText anahtarları): duyuru şeridi ve kayan duyurular */
export const EN_TEXTS: Record<string, string> = {
  "store.workingHours": "Weekdays 09:00–19:00, Saturday 10:00–17:00 (Turkey time, GMT+3)",
  "seo.title": "Derinova Dedektör | {markalar} Metal Detectors and Prices",
  "seo.description": "Derinova Dedektör, a trusted metal detector store in Turkey: {markalar} metal detectors. Genuine, invoiced, under warranty; choose the right detector with expert help.",
  "seo.aboutForAi": "Derinova Dedektör is a metal detector store based in Istanbul, selling {markalar} metal detectors, search coils, pinpointers and accessories across Turkey. Every detector is invoiced with a 2-year warranty and can be verified as genuine by serial number. Before you buy: expert advice (WhatsApp and phone), the 'Which one for me?' detector finder and hands-on trials in the showroom; after you buy: setup training and technical service.",
  "merch.focusNote": "Featured brand",
  "store.announcement": "Free shipping · Up to 3 interest-free instalments · Genuine, invoiced, 2-year warranty · Easy 14-day returns",
  "ticker:Minelab'ın en yeni modelleri stoklarda": "Minelab's latest models are in stock",
  "ticker:3 aya kadar vade farksız taksit": "Up to 3 interest-free instalments",
  "ticker:Seri numaranla orijinallik sorgula": "Check your detector is genuine by serial number",
  "ticker:Hangi dedektör? Uzmanımıza WhatsApp'tan sor": "Which detector? Ask our expert on WhatsApp",
  "nav:Pointer": "Pinpointers",
  "nav:Altın Dedektörü": "Gold Detectors",
  "nav:Define ve Sikke": "Coins & Relics",
  "nav:Sualtı Dedektörü": "Underwater",
  "nav:Derin Arama": "Deep Search",
  "nav:Başlık ve Aksesuar": "Coils & Accessories",
  "nav:Yeni Gelenler": "New Arrivals",
  "nav:En Çok Satılan": "Best Sellers",
};
