# 🐱 CatPass

**CatPass**, tamamen **istemci tarafında şifreleme (Client-Side End-to-End Encryption)** kullanan, güvenli ve kullanıcı dostu bir şifre yöneticisidir. Verileriniz sunucuya ulaşmadan önce tamamen şifrelenir ve hiçbir zaman düz metin olarak depolanmaz.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

## 🎯 Proje Amacı

CatPass, şifre güvenliği konusunda endişe duyan kullanıcılar için geliştirilmiş, **zero-knowledge** prensibiyle çalışan bir şifre yöneticisidir. Ana hedeflerimiz:

- **🔒 Tam Güvenlik**: E2EE ile verileriniz sadece sizin erişebileceğiniz şekilde korunur
- **👥 Takım Çalışması**: Projeler ve gruplar halinde ekip üyeleriyle güvenli şifre paylaşımı
- **🚀 Modern Teknoloji**: En güncel web teknolojileri ile geliştirilmiş performanslı arayüz
- **🎨 Kullanıcı Deneyimi**: Sade, anlaşılır ve kullanımı kolay tasarım

## ✨ Özellikler

### 🔐 Güvenlik Özellikleri
- **End-to-End Encryption (E2EE)**: Tüm veriler istemci tarafında şifrelenir
- **RSA-OAEP + AES-GCM**: Hibrit şifreleme sistemi
- **PBKDF2**: Güçlü anahtar türetme (300,000 iterasyon)
- **Web Crypto API**: Tarayıcının yerli kriptografi API'si
- **Zero-Knowledge Architecture**: Sunucu hiçbir zaman düz metninizi görmez

### 👥 Çok Kullanıcılı Özellikler
- **Projeler**: Şifrelerinizi projeler halinde organize edin
- **Gruplar**: Takım üyeleriyle güvenli şifre paylaşımı
- **Kullanıcı Davetleri**: E-posta ile takım üyelerinizi davet edin
- **Erişim Kontrolü**: Her proje ve grup için ayrı yetkilendirme

### 🎨 Kullanıcı Arayüzü
- **Modern Dashboard**: Responsive ve kullanıcı dostu tasarım
- **Dark/Light Theme**: Sistem temasına uyum
- **Instant Search**: Şifrelerinizi hızlıca bulun
- **Drag & Drop**: Kolay dosya ve kategori yönetimi

## 🛠 Teknoloji Yığını

### Frontend
- **[Next.js 15](https://nextjs.org/)** - React framework'ü
- **[TypeScript](https://www.typescriptlang.org/)** - Tip güvenli JavaScript
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Radix UI](https://www.radix-ui.com/)** - Accessible UI components
- **[Lucide React](https://lucide.dev/)** - Modern ikonlar

### Backend & Authentication
- **[Firebase Auth](https://firebase.google.com/products/auth)** - Kullanıcı kimlik doğrulama
- **[Firestore](https://firebase.google.com/products/firestore)** - NoSQL veritabanı
- **[Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)** - İstemci tarafı şifreleme

### Kriptografi Detayları

#### 🔑 Anahtar Yönetimi
```
1. Master Password → PBKDF2 (300k iterations) → Derived Key
2. RSA-OAEP Key Pair (2048 bit) → User Public/Private Keys
3. AES-GCM Data Keys (256 bit) → Secret Encryption
```

#### 🔐 Şifreleme Mimarisi
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Master Pass   │───▶│   PBKDF2 Key    │───▶│ Private Key Dec │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌─────────────────┐             ▼
│   Secret Data   │───▶│   AES-GCM Enc   │    ┌─────────────────┐
└─────────────────┘    └─────────────────┘    │   Data Key Dec  │
                                ▲              └─────────────────┘
                                │                       ▲
                       ┌─────────────────┐             │
                       │ RSA-OAEP Enc DK │─────────────┘
                       └─────────────────┘
```

#### 🏗 Veri Yapıları

**Kullanıcı Modeli:**
```typescript
interface User {
  uid: string;                    // Firebase Auth UID
  email: string;                  // E-posta adresi
  publicKey: string;              // RSA Public Key (PEM format)
  encryptedPrivateKey: string;    // AES-GCM ile şifrelenmiş Private Key
  kdfSalt: string;               // PBKDF2 salt değeri
}
```

**Şifre Modeli:**
```typescript
interface Secret {
  id: string;                     // Unique identifier
  name: string;                   // Şifre ismi
  projectId: string;              // Bağlı proje ID'si
  encryptedData: string;          // AES-GCM ile şifrelenmiş şifre verisi
  encryptedDataKey: string;       // RSA-OAEP ile şifrelenmiş data key
  lastModified: Date;             // Son değişiklik tarihi
}
```

**Proje & Grup Modelleri:**
```typescript
interface Project {
  id: string;
  name: string;
  ownerId: string;               // Proje sahibi
  memberIds: string[];           // Üye ID'leri
  memberEmails: string[];        // Üye e-postaları
}

interface Group {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  groupPublicKey: string;        // Grup public key'i
}
```

## 🚀 Kurulum

### Gereksinimler
- **Node.js** 18.17 veya üzeri
- **Bun** (önerilen) veya **npm/yarn**
- **Firebase** projesi

### 1. Projeyi Klonlayın
```bash
git clone https://github.com/your-username/catpass.git
cd catpass
```

### 2. Bağımlılıkları Yükleyin
```bash
# Bun kullanarak (önerilen)
bun install

# veya npm ile
npm install
```

### 3. Firebase Kurulumu

#### Firebase Console'da yeni proje oluşturun:
1. [Firebase Console](https://console.firebase.google.com/) 'a gidin
2. "Add project" ile yeni proje oluşturun
3. **Authentication** → **Sign-in method** → **Email/Password** etkinleştirin
4. **Firestore Database** oluşturun (Test mode'da başlayabilirsiniz)

#### Environment variables oluşturun:
```bash
# .env.local dosyası oluşturun
cp .env.example .env.local
```

`.env.local` dosyasını Firebase config değerleri ile doldurun:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Geliştirme Sunucusunu Başlatın
```bash
# Bun ile
bun run dev

# npm ile
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

## 📱 Kullanım

### İlk Kullanım
1. **Kayıt Ol**: E-posta ve şifre ile hesap oluşturun
2. **Master Password**: Güçlü bir master password belirleyin
3. **Key Generation**: Sistem otomatik olarak RSA key pair'inizi oluşturacak

### Şifre Yönetimi
1. **Yeni Şifre**: "+" butonuyla yeni şifre ekleyin
2. **Kategorize**: Projeler halinde organize edin
3. **Paylaş**: Grup üyeleriyle güvenli paylaşım yapın
4. **Arama**: Hızlı arama ile şifrelerinizi bulun

### Takım Çalışması
1. **Proje Oluştur**: Yeni proje oluşturun
2. **Üye Davet Et**: E-posta ile takım üyelerini davet edin
3. **Şifre Paylaş**: Grup şifrelerini güvenle paylaşın

## 🔧 Geliştirme

### Proje Yapısı
```
src/
├── app/                 # Next.js App Router
├── components/          # React bileşenleri
│   ├── ui/             # Temel UI bileşenleri
│   ├── dashboard/      # Dashboard bileşenleri
│   └── modals/         # Modal bileşenleri
├── contexts/           # React Context'leri
├── hooks/              # Custom React hooks
├── lib/                # Utility fonksiyonları
│   ├── crypto.ts       # Kriptografi fonksiyonları
│   ├── firebase.ts     # Firebase konfigürasyonu
│   └── utils.ts        # Genel utility'ler
└── types/              # TypeScript tip tanımları
```

### Build ve Deploy
```bash
# Production build
bun run build

# Build'i test et
bun run start

# Linting
bun run lint
```

### Kod Kalitesi
- **TypeScript**: Güçlü tip kontrolü
- **ESLint**: Kod standardları
- **Prettier**: Kod formatlama (önerilen)

## 🔒 Güvenlik Notları

### ⚠️ Önemli Güvenlik Uyarıları
- **Master Password**: Asla unutmayın! Kurtarma yöntemi yoktur
- **Backup**: Düzenli olarak şifrelerinizi export edin
- **2FA**: Firebase Authentication'da 2FA etkinleştirin
- **HTTPS**: Production'da mutlaka HTTPS kullanın

### 🛡️ Güvenlik Özellikleri
- Tüm veriler istemci tarafında şifrelenir
- Sunucu hiçbir zaman düz metin görmez
- Memory'de bile şifreli tutma
- Otomatik oturum kapatma
- Güvenli anahtar yönetimi

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

### Geliştirme Rehberi
- **Issue** açmadan önce mevcut issue'ları kontrol edin
- **Code style**: Mevcut kod stiline uyun
- **Tests**: Yeni özellikler için test yazın
- **Documentation**: README'yi güncel tutun

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 🙏 Teşekkürler

- **Firebase** - Authentication ve Database
- **Radix UI** - Accessible UI components
- **Lucide** - Beautiful icons
- **Tailwind CSS** - Styling framework

## 📞 İletişim

- **GitHub**: [@EmirSavukV2](https://github.com/EmirSavukV2)
- **E-mail**: emirsvk55@gmail.com

---

<div align="center">
  <strong>🐱 CatPass ile şifreleriniz güvende! 🔒</strong>
  <br>
  <em>Made with ❤️ for CatCoreDevs</em>
</div>

random
