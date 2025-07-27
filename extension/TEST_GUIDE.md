# Chrome Extension Test Rehberi

## Kurulum Adımları:

1. **Chrome'u açın** ve adres çubuğuna şunu yazın:
   ```
   chrome://extensions/
   ```

2. **Sağ üst köşede "Developer mode"** toggle'ını aktif edin

3. **"Load unpacked"** butonuna tıklayın

4. Şu klasörü seçin:
   ```
   c:\Users\EmirSAVUK\Desktop\Projects\catpass\extension
   ```

## Test Etmek İçin:

1. **Web app'in çalıştığından emin olun:**
   - Terminal'de: `npm run dev`
   - Uygulama: `http://localhost:3000`

2. **Extension iconuna tıklayın** (Chrome toolbar'ında)

3. **"Check Again" butonu** ile auth durumunu kontrol edin

## Beklenen Davranış:

✅ **CORS headers eklenmiş** - Extension API'ye erişebilir
✅ **Auth durumu kontrol edilir** - Login durumuna göre arayüz değişir
✅ **Demo verileri gösterilir** - Projects, Groups, Secrets

## Troubleshooting:

- Extension yüklenmezse: Manifest.json'u kontrol et
- CORS hatası alıyorsan: API route'larında CORS headers var mı kontrol et
- Extension görünmüyorsa: Chrome toolbar'da extension iconlarını kontrol et

Extension şu anda demo modda çalışıyor ve Firebase ile gerçek authentication yapmıyor. Bu sadece arayüzü test etmek için.
