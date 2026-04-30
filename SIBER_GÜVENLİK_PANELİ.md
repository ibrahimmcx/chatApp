# 🛡️ SecureChat: Uçtan Uca Şifreleme ve Canlı Görselleştirme Sistemi

Bu proje, modern siber güvenlik standartlarını (RSA + AES) kullanan ve bu süreçleri gerçek zamanlı olarak görselleştiren gelişmiş bir mesajlaşma platformudur. 

## 🚀 Proje Genel Bakış
Sistem; bir **React Native (Expo)** mobil uygulama, bir **Node.js (Socket.io)** backend ve süreçleri canlı izleyen bir **React (Vite)** web panelinden oluşmaktadır.

### Ana Özellikler:
- **Uçtan Uca Şifreleme (E2EE):** Mesajlar sadece gönderen ve alıcının cihazında çözülebilir.
- **Canlı Şifreleme Analizi:** Web paneli üzerinden her mesajın şifreleme/çözme basamaklarını (Encryption Pipeline) izleme.
- **Çoklu Cihaz Senkronizasyonu:** Aynı kullanıcının hem mobil hem web üzerinden eş zamanlı mesaj takibi.

---

## 🔐 Güvenlik Mimarisi

### 1. RSA-2048 (Asimetrik Şifreleme)
- Her kullanıcı ilk kayıtta veya girişte kendine özel bir **RSA-2048** anahtar çifti üretir.
- **Public Key:** Sunucuya gönderilir ve diğer kullanıcıların size şifreli mesaj göndermesi için kullanılır.
- **Private Key:** Sadece kullanıcının kendi cihazında (SecureStorage) saklanır, asla sunucuya gitmez.

### 2. AES-256-CBC (Simetrik Şifreleme)
- Her bir mesaj için rastgele, tek seferlik bir **AES-256** anahtarı ve **IV (Initialization Vector)** üretilir.
- Mesaj içeriği bu anahtarla şifrelenir.
- Ardından bu AES anahtarı, alıcının **RSA Public Key**'i ile şifrelenerek pakete eklenir.

---

## 📊 Görselleştirme Süreci (The Pipeline)

Sistem, bir mesajın hayat döngüsünü 5 kritik adımda web paneline yansıtır:

### A. Şifreleme Boru Hattı (Gönderen Tarafı)
1. **Plaintext:** Kullanıcının yazdığı ham metin.
2. **AES Key Gen:** Rastgele üretilen 32-byte'lık gizli anahtar.
3. **AES Enc:** Mesajın AES anahtarı ve IV ile karmaşık hale getirilmiş hali.
4. **RSA Enc:** AES anahtarının alıcının public key'i ile kilitlenmesi.
5. **Final Payload:** Sunucuya gönderilen JSON paketi.

### B. Şifre Çözme Boru Hattı (Alıcı Tarafı)
1. **Incoming Payload:** Sunucudan gelen şifreli paket.
2. **RSA Dec:** Alıcının kendi private key'ini kullanarak AES anahtarını çözmesi.
3. **AES Dec:** Çözülen anahtar ve IV ile mesajın orijinal haline döndürülmesi.
4. **Plaintext:** Okunabilir mesajın kullanıcı ekranına yansıması.

---

## 🛠️ Teknoloji Yığını
- **Frontend:** React Native, Expo, React Navigation
- **Web Panel:** React (Vite), Framer Motion, Lucide Icons, Socket.io-Client
- **Backend:** Node.js, Express, Socket.io
- **Kriptografi:** Node-Forge (RSA), AES-JS (AES), Expo-Crypto (Hash/SHA-256)

---

## 📝 Kurulum ve Çalıştırma
Sistemi tam kapasite çalıştırmak için:
1. `server` klasöründe: `node index.js`
2. `web-app` klasöründe: `npm run dev`
3. `chatApp` kök dizininde: `npx expo start --tunnel`

---
*Bu döküman, sistemin siber güvenlik farkındalığı ve teknik şeffaflık amacıyla geliştirildiğini belgelemektedir.*
