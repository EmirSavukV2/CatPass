# Chrome Extension Kurulum Rehberi

## Adımlar:

1. **Chrome'u açın** ve adres çubuğuna `chrome://extensions/` yazın

2. **Developer mode**'u aktif edin (sağ üst köşedeki düğme)

3. **"Load unpacked"** butonuna tıklayın

4. Dosya gezgininde şu klasörü seçin:
   ```
   c:\Users\EmirSAVUK\Desktop\Projects\catpass\extension
   ```

5. Extension yüklendikten sonra Chrome toolbar'ında CatPass iconunu göreceksiniz

## Test Etmek İçin:

1. Web app'in çalıştığından emin olun (http://localhost:3000)
2. CatPass extension iconuna tıklayın
3. Extension popup'ı açılacak

## Extension Özellikleri:

✅ **Projeler**: Tüm projelerinizi görüntüleyin
✅ **Gruplar**: Üye olduğunuz grupları görüntüleyin  
✅ **Şifreler**: Seçili proje/grup bağlamında şifreleri görüntüleyin
✅ **Arama**: Şifreler içinde arama yapın
✅ **Şifre Detayları**: Modal ile detayları görüntüleyin
✅ **Kopyalama**: Şifreleri ve diğer alanları panoya kopyalayın
✅ **Hızlı Kopyalama**: Lista üzerinden direkt şifre kopyalama

## Önemli Notlar:

- Extension şu anda demo verileri kullanıyor
- Gerçek Firebase verilerini kullanmak için API endpoint'lerini güncellemeniz gerekir
- Authentication şu anda basitleştirilmiş durumda

## Geliştirme:

Extension dosyalarını değiştirdikten sonra:
1. `chrome://extensions/` sayfasına gidin
2. CatPass extension'unda "🔄" (reload) butonuna tıklayın
3. Değişikliklerinizi test edin
