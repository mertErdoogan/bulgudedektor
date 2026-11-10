/**
 * Yasal sayfa metinleri (6502 sayılı TKHK, Mesafeli Sözleşmeler Yönetmeliği, 6698 sayılı KVKK, 6563 sayılı Kanun).
 * {{unvan}}, {{adres}}, {{vergi_no}} gibi yer tutucular gösterim anında Ayarlar → Mağaza bilgileriyle doldurulur
 * (src/lib/legal-tokens.ts). Yayına almadan önce bir hukukçuya kontrol ettirilmesi önerilir.
 */

const SATICI = `<table>
<tr><th>Unvan</th><td>{{unvan}}</td></tr>
<tr><th>Adres</th><td>{{adres}}</td></tr>
<tr><th>Telefon</th><td>{{telefon}} · WhatsApp {{whatsapp}}</td></tr>
<tr><th>E-posta</th><td>{{eposta}}</td></tr>
<tr><th>Vergi dairesi / No</th><td>{{vergi_dairesi}} / {{vergi_no}}</td></tr>
<tr><th>MERSİS No</th><td>{{mersis}}</td></tr>
</table>`;

export const LEGAL_PAGES: { slug: string; title: string; footerGroup?: string; seoDescription?: string; content: string }[] = [
  {
    slug: "mesafeli-satis-sozlesmesi",
    title: "Mesafeli satış sözleşmesi",
    footerGroup: "Yasal",
    seoDescription: "Arena Dedektör mesafeli satış sözleşmesi: taraflar, ödeme, teslimat, cayma hakkı ve uyuşmazlık çözümü.",
    content: `<h2>1. Taraflar</h2>
<h3>Satıcı</h3>${SATICI}
<h3>Alıcı</h3>
<p>Sipariş sırasında adı, soyadı, adresi, telefonu ve e-posta adresi bildirilen kişidir. Alıcı bilgileri ve siparişe özel ayrıntılar, siparişin onaylanmasıyla birlikte e-posta ile gönderilen sözleşme nüshasında yer alır.</p>

<h2>2. Konu</h2>
<p>Bu sözleşme, Alıcının {{site}} internet sitesi üzerinden elektronik ortamda sipariş verdiği ürünün satışı ve teslimi ile ilgili olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerini düzenler.</p>

<h2>3. Ürün, fiyat ve ödeme</h2>
<p>Ürünün türü, markası, modeli, adedi ve vergiler dahil satış fiyatı ürün sayfasında ve sipariş özetinde gösterildiği gibidir. Fiyatlara KDV dahildir. Kargo ücreti varsa ödeme adımında ayrıca gösterilir.</p>
<p>Ödeme; kredi/banka kartı (iyzico güvenli ödeme altyapısıyla, 3D Secure), havale/EFT veya mağazada ödeme yöntemlerinden biriyle yapılır. Taksitli ödemelerde vade farkı bankanın uyguladığı oranlara göre ödeme adımında gösterilir. Kart bilgileri Satıcı tarafından görülmez ve saklanmaz.</p>
<p>Havale/EFT ile ödemelerde sipariş, ödemenin Satıcı hesabına geçmesiyle işleme alınır. 3 iş günü içinde ödemesi yapılmayan siparişler iptal edilebilir.</p>

<h2>4. Teslimat</h2>
<p>Ürün, ödemenin onaylanmasından itibaren en geç 3 iş günü içinde kargoya verilir ve Alıcının bildirdiği adrese teslim edilir. Yasal teslim süresi her halükarda 30 günü geçemez. Teslim anında ambalajda hasar görülürse Alıcının kargo görevlisine tutanak tutturması ve Satıcıya bildirmesi gerekir.</p>
<p>Teslim, Alıcı ya da Alıcının gösterdiği adresteki kişiye yapılır. Alıcı adreste bulunmazsa kargo şirketinin bildirim prosedürü uygulanır.</p>

<h2>5. Cayma hakkı</h2>
<p>Alıcı, ürünü teslim aldığı tarihten itibaren <strong>14 gün</strong> içinde hiçbir gerekçe göstermeden ve cezai şart ödemeden sözleşmeden cayabilir. Cayma bildirimi; {{eposta}} adresine e-posta, {{telefon}} numaralı telefon ya da sitedeki "Hesabım → Siparişlerim → İade talebi" bölümü üzerinden yapılabilir.</p>
<p>Alıcı, cayma bildiriminden itibaren 10 gün içinde ürünü faturası, aksesuarları ve kutusuyla birlikte Satıcıya gönderir. Satıcı, cayma bildiriminin ulaşmasından itibaren 14 gün içinde ürün bedelini ve varsa teslim masrafını ödemenin yapıldığı yönteme uygun şekilde iade eder.</p>
<p>Ürünün mutat kullanımı dışında kullanılması, değiştirilmesi veya hasar görmesi halinde Alıcı, üründeki değer kaybından sorumludur. Ürünün işlevini öğrenmek için yapılan makul inceleme (kutusundan çıkarma, kurulumu yapıp çalıştırma) değer kaybı sayılmaz.</p>
<p>Yönetmeliğin 15. maddesindeki istisnalar (Alıcının isteğiyle kişiye özel hazırlanan ürünler, ambalajı açılmış yazılım lisansları ve benzerleri) saklıdır.</p>

<h2>6. Garanti ve ayıplı ürün</h2>
<p>Satılan cihazlar, üretici/distribütör garantisi kapsamında en az 2 yıl garantilidir. Ayıplı ürünlerde Alıcı, 6502 sayılı Kanunun 11. maddesindeki seçimlik haklarını (sözleşmeden dönme, bedel indirimi, ücretsiz onarım, ayıpsız misliyle değişim) kullanabilir.</p>

<h2>7. Uyuşmazlık çözümü</h2>
<p>Bu sözleşmeden doğan uyuşmazlıklarda, Ticaret Bakanlığınca her yıl belirlenen parasal sınırlar dahilinde Alıcının yerleşim yerindeki ya da işlemin yapıldığı yerdeki Tüketici Hakem Heyetleri, bu sınırları aşan durumlarda Tüketici Mahkemeleri yetkilidir. Başvurular e-Devlet üzerinden TÜBİS ile de yapılabilir.</p>

<h2>8. Yürürlük</h2>
<p>Alıcı, siparişi onaylamadan önce ön bilgilendirme formunu ve bu sözleşmeyi okuduğunu ve elektronik ortamda onayladığını kabul eder. Sözleşme, siparişin onaylandığı tarihte yürürlüğe girer ve bir nüshası Alıcının e-posta adresine gönderilir.</p>`,
  },
  {
    slug: "on-bilgilendirme-formu",
    title: "Ön bilgilendirme formu",
    footerGroup: "Yasal",
    seoDescription: "Mesafeli Sözleşmeler Yönetmeliği uyarınca satıcı bilgileri, ürün, ödeme, teslimat ve cayma hakkına dair ön bilgilendirme.",
    content: `<p>Bu form, Mesafeli Sözleşmeler Yönetmeliğinin 5. maddesi uyarınca sipariş verilmeden önce Alıcıyı bilgilendirmek amacıyla hazırlanmıştır.</p>
<h2>1. Satıcı bilgileri</h2>${SATICI}
<h2>2. Ürünün temel nitelikleri ve fiyatı</h2>
<p>Ürünün türü, markası, modeli, teknik özellikleri, adedi ve vergiler dahil toplam fiyatı ürün sayfasında ve ödeme adımındaki sipariş özetinde yer alır. Kargo ücreti varsa ayrıca gösterilir. Sitedeki fiyatlar güncellenene kadar geçerlidir; sipariş verilmiş ürünün fiyatı sonradan değiştirilmez.</p>
<h2>3. Ödeme</h2>
<p>Kredi/banka kartıyla tek çekim veya {{taksit}} aya kadar taksit ({{vade_farksiz}} taksite kadar vade farksız), havale/EFT ya da mağazada ödeme. Havale/EFT için hesap bilgileri:</p>
{{banka_hesaplari}}
<h2>4. Teslimat</h2>
<p>Stoktaki ürünler ödeme onayından sonra en geç 3 iş günü içinde kargoya verilir. Teslimat Alıcının bildirdiği adrese anlaşmalı kargo firmasıyla yapılır; mağazadan teslim seçeneği de bulunur.</p>
<h2>5. Cayma hakkı</h2>
<p>Alıcı, ürünü teslim aldığı tarihten itibaren 14 gün içinde gerekçe göstermeden cayma hakkını kullanabilir. Cayma bildirimi {{eposta}} adresine veya "Hesabım" sayfasındaki iade talebi bölümünden yapılır. Bedel, bildirimin ulaşmasından itibaren en geç 14 gün içinde iade edilir. Ayrıntılar için <a href="/sayfa/iade-ve-degisim">İade ve değişim</a> sayfasına bakınız.</p>
<h2>6. Şikâyet ve itiraz</h2>
<p>Şikâyetlerinizi {{telefon}} veya {{eposta}} üzerinden iletebilirsiniz. Uyuşmazlıklarda Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.</p>`,
  },
  {
    slug: "iade-ve-degisim",
    title: "İade, değişim ve garanti",
    footerGroup: "Yardım",
    seoDescription: "14 gün koşulsuz iade, değişim ve 2 yıl garanti koşulları. İade talebi nasıl oluşturulur?",
    content: `<h2>14 gün içinde koşulsuz iade</h2>
<p>Satın aldığınız ürünü teslim aldığınız tarihten itibaren <strong>14 gün</strong> içinde gerekçe göstermeden iade edebilirsiniz (6502 sayılı Kanun ve Mesafeli Sözleşmeler Yönetmeliği).</p>
<h3>Nasıl iade ederim?</h3>
<ol>
<li>Üyeyseniz <a href="/hesabim">Hesabım → Siparişlerim</a> bölümünden "İade talebi" oluşturun. Üye değilseniz {{eposta}} adresine sipariş numaranızla yazın ya da {{telefon}} numarasını arayın.</li>
<li>Ürünü faturası, tüm aksesuarları ve kutusuyla birlikte paketleyin.</li>
<li>Size bildirilen anlaşmalı kargo koduyla 10 gün içinde gönderin. Anlaşmalı kargoyla gönderilen iadelerde kargo ücretini biz öderiz.</li>
</ol>
<p>Ürün bize ulaşıp kontrol edildikten sonra bedeli en geç 14 gün içinde ödeme yaptığınız yönteme iade edilir. Kartla ödemelerde iadenin hesabınıza yansıma süresi bankanıza bağlıdır.</p>
<h3>Değer kaybı</h3>
<p>Cihazı kutusundan çıkarıp kurmanız ve denemeniz iadeye engel değildir. Ancak sahada kullanımdan kaynaklanan çizik, kırık, çamur/su hasarı gibi değer kayıplarında kesinti yapılabilir.</p>
<h2>Değişim</h2>
<p>Farklı bir modelle değiştirmek isterseniz 14 gün içinde iade talebi oluşturup yeni siparişinizi verebilir ya da bizi arayarak değişimi tek seferde yapabilirsiniz; fiyat farkı varsa tahsil edilir veya iade edilir.</p>
<h2>Garanti ve teknik servis</h2>
<p>Tüm cihazlar faturalı ve en az <strong>2 yıl</strong> garantilidir. Garanti kapsamındaki arızalarda onarım, değişim veya iade haklarınız 6502 sayılı Kanun kapsamında saklıdır. Arıza bildirimi için <a href="/servis">servis kaydı</a> oluşturabilirsiniz; ürününüzün orijinal olduğunu <a href="/seri-no">seri numarası sorgulama</a> sayfasından kontrol edebilirsiniz.</p>
<p>Kullanım hatası, darbe, yetkisiz servis müdahalesi ve kullanım kılavuzuna aykırı kullanım (örneğin su geçirmez olmayan kontrol ünitesinin suya sokulması) garanti kapsamı dışındadır.</p>
<h2>Hasarlı teslimat</h2>
<p>Kargo kolisi hasarlıysa teslim almadan önce kargo görevlisine tutanak tutturun ve aynı gün bize bildirin; ürün ücretsiz olarak değiştirilir.</p>`,
  },
  {
    slug: "kvkk-aydinlatma-metni",
    title: "KVKK aydınlatma metni",
    footerGroup: "Yasal",
    seoDescription: "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni.",
    content: `<p>{{unvan}} ("Şirket") olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca veri sorumlusu sıfatıyla kişisel verilerinizi aşağıda açıklanan çerçevede işliyoruz.</p>
<h2>1. İşlenen kişisel veriler</h2>
<ul>
<li><strong>Kimlik:</strong> ad, soyad; fatura için gerekirse T.C. kimlik numarası</li>
<li><strong>İletişim:</strong> e-posta, telefon, teslimat ve fatura adresi</li>
<li><strong>Müşteri işlem:</strong> sipariş, iade, servis ve talep kayıtları, sepet ve favoriler</li>
<li><strong>Finans:</strong> ödeme ve iade kayıtları (kart bilgileri ödeme kuruluşu iyzico tarafından işlenir, Şirket tarafından saklanmaz)</li>
<li><strong>İşlem güvenliği:</strong> IP adresi, giriş kayıtları, tarayıcı bilgileri</li>
<li><strong>Pazarlama:</strong> açık rızanız varsa ticari elektronik ileti tercihleri, gezinme ve alışveriş tercihleri</li>
</ul>
<h2>2. İşleme amaçları ve hukuki sebepler</h2>
<ul>
<li>Siparişin alınması, ödemenin tahsili, teslimat, fatura, iade ve garanti işlemleri — <em>sözleşmenin kurulması ve ifası (KVKK m.5/2-c), hukuki yükümlülük (m.5/2-ç)</em></li>
<li>Müşteri hizmetleri, servis ve şikâyet yönetimi — <em>sözleşmenin ifası, meşru menfaat (m.5/2-f)</em></li>
<li>Bilgi güvenliği, dolandırıcılığın önlenmesi, 5651 sayılı Kanun kapsamında kayıt — <em>hukuki yükümlülük, meşru menfaat</em></li>
<li>Kampanya, bülten ve kişiselleştirilmiş öneriler — <em>açık rıza (m.5/1)</em></li>
</ul>
<h2>3. Aktarım</h2>
<p>Kişisel verileriniz yalnızca yukarıdaki amaçlarla sınırlı olarak; kargo şirketlerine (teslimat), ödeme kuruluşuna (iyzico), e-fatura entegratörüne, muhasebe ve hukuk danışmanlarına, barındırma/e-posta hizmet sağlayıcılarına ve talep halinde yetkili kamu kurumlarına aktarılabilir. Yurt dışında bulunan hizmet sağlayıcılara aktarım KVKK m.9 hükümlerine uygun şekilde yapılır.</p>
<h2>4. Toplama yöntemi</h2>
<p>Verileriniz internet sitemiz, telefon, WhatsApp, e-posta ve mağazamız aracılığıyla elektronik veya fiziki ortamda toplanır.</p>
<h2>5. Saklama süresi</h2>
<p>Sipariş ve fatura kayıtları vergi mevzuatı gereği 10 yıl, diğer veriler işleme amacının gerektirdiği süre boyunca saklanır; süre sonunda silinir, yok edilir veya anonim hale getirilir. Hesabınızı silmeniz halinde kimlik ve iletişim bilgileriniz anonimleştirilir, yasal saklama yükümlülüğü olan sipariş kayıtları korunur.</p>
<h2>6. Haklarınız (KVKK m.11)</h2>
<p>Verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, amacına uygun kullanılıp kullanılmadığını öğrenme, aktarıldığı üçüncü kişileri bilme, düzeltilmesini, silinmesini veya yok edilmesini isteme, otomatik sistemlerle analiz sonucu aleyhinize bir sonuca itiraz etme ve zararın giderilmesini talep etme haklarına sahipsiniz.</p>
<p>Üyeyseniz <a href="/hesabim">Hesabım</a> sayfasından verilerinizi indirebilir ve hesabınızı silebilirsiniz. Diğer talepleriniz için {{eposta}} adresine veya {{adres}} adresine yazılı olarak başvurabilirsiniz. Başvurular en geç 30 gün içinde ücretsiz sonuçlandırılır.</p>`,
  },
  {
    slug: "cerez-politikasi",
    title: "Çerez politikası",
    footerGroup: "Yasal",
    seoDescription: "Sitemizde kullanılan çerezler ve çerez tercihlerinizi nasıl yönetebileceğiniz.",
    content: `<p>{{site}} sitesinde, sitenin çalışması ve deneyiminizi iyileştirmek için çerezler kullanılır. Zorunlu olmayan çerezler yalnızca onayınızla çalışır; tercihinizi sayfanın altındaki "Çerez tercihleri" bağlantısıyla dilediğiniz zaman değiştirebilirsiniz.</p>
<h2>Kullandığımız çerezler</h2>
<table>
<tr><th>Tür</th><th>Amaç</th><th>Onay</th></tr>
<tr><td>Zorunlu</td><td>Oturum, sepet, güvenlik, çerez tercihinizin saklanması</td><td>Gerekmez</td></tr>
<tr><td>İşlevsel</td><td>Son baktığınız ürünler, favoriler, karşılaştırma listesi (tarayıcınızda saklanır)</td><td>Gerekmez</td></tr>
<tr><td>Analitik</td><td>Google Analytics ile ziyaret istatistikleri</td><td>Gerekir</td></tr>
<tr><td>Pazarlama</td><td>Meta (Facebook/Instagram) pikseli ile reklam ölçümü</td><td>Gerekir</td></tr>
</table>
<h2>Çerezleri nasıl kontrol ederim?</h2>
<p>Tarayıcınızın ayarlarından çerezleri silebilir veya engelleyebilirsiniz. Zorunlu çerezleri engellemeniz halinde sepet ve üyelik gibi özellikler çalışmayabilir.</p>
<p>Kişisel verilerinizin işlenmesine dair ayrıntılar için <a href="/sayfa/kvkk-aydinlatma-metni">KVKK aydınlatma metni</a>ni inceleyebilirsiniz.</p>`,
  },
  {
    slug: "uyelik-sozlesmesi",
    title: "Üyelik sözleşmesi",
    footerGroup: "Yasal",
    content: `<h2>1. Taraflar ve konu</h2>
<p>Bu sözleşme, {{unvan}} ("Şirket") ile {{site}} sitesine üye olan kişi ("Üye") arasında, sitenin üyelik hizmetlerinden yararlanma koşullarını düzenler.</p>
<h2>2. Üyelik</h2>
<p>Üyelik, kayıt formunun doğru bilgilerle doldurulması ve bu sözleşmenin onaylanmasıyla kurulur. 18 yaşından küçükler üye olamaz. Üye, giriş bilgilerinin gizliliğinden sorumludur; hesabının yetkisiz kullanıldığını fark ederse derhal Şirkete bildirir.</p>
<h2>3. Üyenin yükümlülükleri</h2>
<ul>
<li>Doğru ve güncel bilgi vermek,</li>
<li>Siteyi hukuka ve genel ahlaka uygun kullanmak; yorum ve değerlendirmelerde başkalarının haklarını ihlal etmemek,</li>
<li>Satın aldığı cihazları 2863 sayılı Kültür ve Tabiat Varlıklarını Koruma Kanunu ve ilgili mevzuata uygun şekilde, izinsiz kazı ve arama yapmadan kullanmak.</li>
</ul>
<h2>4. Şirketin hakları</h2>
<p>Şirket, sözleşmeye aykırı davranan üyeliği askıya alabilir veya sonlandırabilir; uygunsuz yorumları yayından kaldırabilir. Site içeriği ve fiyatlar önceden bildirimde bulunmaksızın değiştirilebilir; verilmiş siparişler bu değişiklikten etkilenmez.</p>
<h2>5. Ticari ileti</h2>
<p>Kampanya ve bülten e-postaları/SMS'leri yalnızca Üyenin onay vermesi halinde gönderilir. Üye, her iletideki bağlantıdan veya Hesabım sayfasından onayını dilediği zaman geri alabilir.</p>
<h2>6. Üyeliğin sona ermesi</h2>
<p>Üye, Hesabım sayfasından hesabını dilediği zaman silebilir. Bu durumda kişisel veriler KVKK aydınlatma metninde açıklandığı şekilde anonimleştirilir.</p>
<h2>7. Uyuşmazlık</h2>
<p>Bu sözleşmeden doğan uyuşmazlıklarda Türk hukuku uygulanır; tüketici işlemlerinde Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.</p>`,
  },
  {
    slug: "gizlilik-ve-guvenlik",
    title: "Gizlilik ve güvenlik",
    footerGroup: "Yasal",
    content: `<h2>Ödeme güvenliği</h2>
<p>Kartlı ödemeler BDDK lisanslı ödeme kuruluşu <strong>iyzico</strong> altyapısıyla ve 3D Secure doğrulamasıyla alınır. Kart bilgileriniz sitemizde saklanmaz, bizim tarafımızdan görülmez. Tüm sayfalar SSL (https) ile şifrelenir.</p>
<h2>Hesap güvenliği</h2>
<p>Şifreniz geri döndürülemez şekilde (bcrypt) saklanır. Tekrarlanan hatalı girişler geçici olarak engellenir. Şifrenizi unutursanız e-posta adresinize tek kullanımlık sıfırlama bağlantısı gönderilir.</p>
<h2>Kişisel verileriniz</h2>
<p>Bilgileriniz yalnızca siparişinizi tamamlamak, size destek vermek ve onay verdiyseniz kampanyalardan haberdar etmek için kullanılır; satılmaz veya kiralanmaz. Ayrıntılar: <a href="/sayfa/kvkk-aydinlatma-metni">KVKK aydınlatma metni</a>, <a href="/sayfa/cerez-politikasi">Çerez politikası</a>.</p>
<h2>Sahte sitelere dikkat</h2>
<p>Resmi sitemiz yalnızca <strong>{{site}}</strong> adresidir. Banka hesaplarımız şirket unvanımıza ({{unvan}}) kayıtlıdır; farklı isimdeki hesaplara ödeme yapmayın. Şüpheli bir durumda {{telefon}} numarasından bize ulaşın.</p>`,
  },
  {
    slug: "odeme-ve-teslimat",
    title: "Ödeme ve teslimat",
    footerGroup: "Yardım",
    seoDescription: "Kredi kartına taksit, havale/EFT banka hesapları, kargo ve teslimat süreleri.",
    content: `<h2>Ödeme seçenekleri</h2>
<ul>
<li><strong>Kredi / banka kartı:</strong> tek çekim veya {{taksit}} aya kadar taksit. {{vade_farksiz}} taksite kadar vade farkı yoktur; taksit oranlarını ürün sayfasındaki "Taksit seçenekleri" tablosunda görebilirsiniz.</li>
<li><strong>Havale / EFT:</strong> sipariş sonrası aşağıdaki hesaplardan birine ödeme yapıp sipariş sayfanızdan "Ödeme bildirimi" gönderin. Açıklamaya sipariş numaranızı yazmayı unutmayın.</li>
<li><strong>Mağazada ödeme:</strong> showroomumuzda nakit veya POS ile.</li>
</ul>
<h3>Banka hesaplarımız</h3>
{{banka_hesaplari}}
<p>Hesap sahibi: {{unvan}}</p>
<h2>Teslimat</h2>
<p>Stoktaki ürünler ödeme onayından sonra aynı gün ya da en geç 3 iş günü içinde kargoya verilir. Kargo takip numarası e-posta ile iletilir ve sipariş sayfanızda görünür. Siparişinizi showroomumuzdan da teslim alabilirsiniz: {{adres}}.</p>
<p>Teslim alırken koliyi kontrol edin; hasar varsa kargo görevlisine tutanak tutturun.</p>`,
  },
  {
    slug: "hakkimizda",
    title: "Hakkımızda",
    footerGroup: "Kurumsal",
    seoDescription: "Arena Dedektör: Minelab Türkiye yetkili distribütörü. İstanbul Şişli'de showroom, uzman danışmanlık ve teknik servis.",
    content: `<p><strong>Arena Dedektör</strong>, Türkiye'de dedektör satışı ve üretimi alanındaki en köklü firmalardan biridir ve <strong>Minelab'ın Türkiye yetkili distribütörüdür</strong>. Minelab'ın yanı sıra Nokta, XP, Garrett ve CoilTek ürünlerini orijinal, faturalı ve garantili olarak sunuyoruz.</p>
<h2>Neden Arena?</h2>
<ul>
<li><strong>Yetkili distribütör güvencesi:</strong> tüm cihazlar resmi yollarla ithal edilir, seri numarasıyla orijinallik sorgulanabilir.</li>
<li><strong>Uzman danışmanlık:</strong> aradığınız şeye ve arazinize göre doğru cihazı birlikte seçiyoruz; telefon, WhatsApp veya showroomda.</li>
<li><strong>Satış sonrası destek:</strong> kurulum ve kullanım eğitimi, yedek parça ve teknik servis.</li>
</ul>
<h2>Showroom</h2>
<p>{{adres}}<br>Telefon: {{telefon}} · WhatsApp: {{whatsapp}} · {{eposta}}</p>`,
  },
];
