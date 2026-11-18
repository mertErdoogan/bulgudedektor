/**
 * Mağaza tarafındaki form işlemlerinin (giriş, kayıt, iletişim, yorum, hesap…) mesajlarının İngilizcesi.
 * Mesajlar kodda Türkçe yazılır; İngilizce sayfadan gelen istekte safe() sonucu buradan çevrilir.
 * Eşleşmeyen mesaj Türkçe kalır (panel mesajları bilinçli olarak burada yok).
 */
const EXACT: Record<string, string> = {
  "14 günlük iade süresi dolmuş. Arıza varsa servis kaydı açabilirsin.": "The 14-day return period has ended. If there's a fault, you can open a service request.",
  "Ad ve e-posta zorunlu.": "Name and email are required.",
  "Ad ve soyadını yaz.": "Enter your first and last name.",
  "Ad, iletişim ve soru alanlarını doldurun.": "Fill in your name, contact details and question.",
  "Adres alanlarını doldur.": "Fill in the address fields.",
  "Arızayı biraz daha detaylı anlat (en az 10 karakter).": "Describe the fault in a bit more detail (at least 10 characters).",
  "Aydınlatma metnini onayla.": "Please confirm you've read the privacy notice.",
  "Aydınlatma metnini onaylayın.": "Please confirm you've read the privacy notice.",
  "Bağlantının süresi dolmuş veya daha önce kullanılmış. Yeniden şifre yenileme iste.": "This link has expired or has already been used. Request a new password reset.",
  "Bu cihaz hesabında bulunamadı. Sayfayı yenileyip tekrar dene.": "This device wasn't found in your account. Refresh the page and try again.",
  "Bu e-posta veya telefon başka bir hesapta kayıtlı.": "This email or phone is registered to another account.",
  "Bu e-posta veya telefon ile zaten hesap var. Giriş yap.": "An account already exists with this email or phone. Please sign in.",
  "Bu telefon başka bir e-posta ile kayıtlı. Giriş yap veya bize yaz.": "This phone is registered with another email. Sign in or contact us.",
  "Cihaz modelini yaz.": "Enter the detector model.",
  "Devam eden siparişin var. Teslim edildikten sonra hesabını silebilirsin.": "You have an order in progress. You can delete your account once it's delivered.",
  "E-posta gönderilemedi, lütfen bize yaz.": "We couldn't send the email, please contact us.",
  "E-posta veya telefon girin.": "Enter your email or phone.",
  "Geçerli bir cep telefonu gir.": "Enter a valid mobile number.",
  "Geçerli bir e-posta gir.": "Enter a valid email address.",
  "Geçerli bir e-posta girin.": "Enter a valid email address.",
  "Hangi cihazında sorun olduğunu seç.": "Choose which of your detectors has the problem.",
  "Kayıt alınamadı.": "We couldn't save your request.",
  "Mevcut şifre hatalı.": "Your current password is incorrect.",
  "Puan verin ve en az 10 karakterlik yorum yazın.": "Give a rating and write a review of at least 10 characters.",
  "Robot doğrulaması başarısız, sayfayı yenileyip tekrar dene.": "Bot check failed, refresh the page and try again.",
  "Sipariş bulunamadı.": "Order not found.",
  "Tüm alanları doldurun.": "Fill in all fields.",
  "Yeni şifre en az 8 karakter olmalı.": "Your new password must be at least 8 characters.",
  "Yorum yazmak için giriş yapın.": "Sign in to write a review.",
  "Çok fazla deneme. 15 dakika sonra tekrar dene.": "Too many attempts. Please try again in 15 minutes.",
  "Çok fazla deneme. Biraz sonra tekrar deneyin.": "Too many attempts. Please try again shortly.",
  "Çok fazla hatalı deneme. 5 dakika sonra tekrar dene.": "Too many failed attempts. Please try again in 5 minutes.",
  "Çok fazla istek. Bir saat sonra tekrar dene.": "Too many requests. Please try again in an hour.",
  "Çok fazla kayıt denemesi. Biraz sonra tekrar dene.": "Too many sign-up attempts. Please try again shortly.",
  "Ürün bulunamadı.": "Product not found.",
  "İade sebebini seç.": "Choose a reason for the return.",
  "İade talebi teslim edilmiş siparişler için açılır. Henüz yoldaysa teslim aldıktan sonra açabilir, kargoya verilmemiş siparişi iptal için bize yazabilirsin.":
    "Return requests are for delivered orders. If it's still on its way, open one after delivery; to cancel an order that hasn't shipped, contact us.",
  "Şifre en az 8 karakter olmalı.": "Password must be at least 8 characters.",
  "Şifre hatalı.": "Incorrect password.",
  "Şifreler aynı değil.": "Passwords don't match.",
  "Adres eklendi.": "Address added.",
  "Adres silindi.": "Address deleted.",
  "Bilgilerin güncellendi.": "Your details have been updated.",
  "Doğrulama e-postası gönderildi. Gelen kutunu (ve gereksiz klasörünü) kontrol et.": "Verification email sent. Check your inbox (and spam folder).",
  "E-posta adresin zaten doğrulanmış.": "Your email address is already verified.",
  "Hesabın silindi.": "Your account has been deleted.",
  "Kaydın alındı.": "We've received your request.",
  "Mesajın alındı. Çalışma saatlerinde en geç birkaç saat içinde dönüyoruz.": "Message received. We reply within a few hours during opening hours.",
  "Sorun alındı. Uzmanımız en kısa sürede yanıtlayacak.": "Question received. Our expert will reply as soon as possible.",
  "Stoğa girince sana haber vereceğiz.": "We'll let you know when it's back in stock.",
  "Teşekkürler.": "Thank you.",
  "Yorumun alındı, onaylandıktan sonra yayınlanacak. Teşekkürler!": "Thanks! Your review has been received and will be published after approval.",
  "Şifren güncellendi, giriş yaptın.": "Your password has been updated and you're signed in.",
  "Oturumun kapanmış, lütfen tekrar giriş yap.": "Your session has expired, please sign in again.",
  "Beklenmeyen bir hata oluştu.": "Something went wrong.",
  "Hesabın oluşturuldu. E-posta adresine doğrulama bağlantısı gönderdik.": "Your account has been created. We've sent a verification link to your email.",
  "Hesabın oluşturuldu.": "Your account has been created.",
  "Bilgilerin güncellendi. Yeni e-posta adresine doğrulama bağlantısı gönderdik.": "Your details have been updated. We've sent a verification link to your new email.",
  "E-posta/telefon veya şifre hatalı.": "Incorrect email/phone or password.",
  "Bu hesap için henüz şifre belirlenmemiş. 'Şifremi unuttum' ile e-postana gelen bağlantıdan şifre oluştur.": "No password has been set for this account yet. Use 'Forgot password' to get a link by email and set one.",
  "Bu değer zaten kullanılıyor (benzersiz olmalı). Lütfen değiştirin.": "This value is already in use. Please change it.",
};

const PATTERNS: [RegExp, string][] = [
  [/^Hoş geldin (.+)!$/, "Welcome, $1!"],
  [/^Bu cihaz için zaten açık bir servis kaydın var \(#(\d+)\)\. Durumunu Servis sekmesinden izleyebilirsin\.$/, "You already have an open service request for this detector (#$1). Track it in the Service tab."],
];

export function messageToEnglish(msg: string | undefined): string | undefined {
  if (!msg) return msg;
  if (EXACT[msg]) return EXACT[msg];
  for (const [re, en] of PATTERNS) if (re.test(msg)) return msg.replace(re, en);
  return msg;
}
