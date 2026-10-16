# MediRemind — Test Senaryoları

Yazılım yaşam döngüsü **Test** aşaması için manuel test senaryoları.

**Ekran görüntülü kanıt belgesi (Word):** [`TEST_KANITLARI.doc`](./TEST_KANITLARI.doc)

## Ön Koşullar

- `.env` dosyasında Supabase ve Gemini API anahtarları tanımlı
- `supabase/schema.sql` ve migration dosyaları (001–006) çalıştırılmış
- Mobil: `npx expo start`
- Web panel: `cd mediremind-web && npm run dev`

---

## TS-01: Kullanıcı Kaydı ve Girişi

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Kayıt ol → ad, e-posta, şifre | Kayıt başarılı |
| 2 | Giriş yap | Ana sayfaya yönlendirme |
| 3 | Çıkış yap (Profil) | Login ekranı |
| 4 | Yanlış şifre | Hata mesajı |

**SS:** `TS-01-*.png` · **Sonuç:** ☐ Geçti ☐ Kaldı

---

## TS-02: İlaç Ekleme ve Listeleme

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | İlaçlarım → İlaç Ekle → yeni form | Ad, günlük kez, saatler, süre |
| 2 | Kaydet | Başarı mesajı |
| 3 | Ana sayfada görünür | Doz satırları doğru |
| 4 | İlaçlarım listesi | Aktif badge, saat chip'leri |

**SS:** `TS-02-*.png` · **Sonuç:** ☐ Geçti ☐ Kaldı

---

## TS-03: Günlük Alım Takibi

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Ana sayfa → doza dokun | "Alındı" |
| 2 | İlerleme çubuğu | Yüzde güncellenir |
| 3 | Uygulama kapat-aç | Durum korunur |
| 4 | Supabase `medication_intake_logs` | Kayıt oluşur |

**SS:** `TS-03-*.png` · **Sonuç:** ☐ Geçti ☐ Kaldı

---

## TS-04: AI İlaç Kutusu Tarama (Bilgisayar Görüsü)

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Tara → fotoğraf çek | Yükleme |
| 2 | AI analiz | İlaç kartları |
| 3 | Sarı/kırmızı vurgular | Yan etki / etkileşim |
| 4 | Son taramalar | Geçmiş kayıt |

**SS:** `TS-04-*.png` · **Sonuç:** ☐ Geçti ☐ Kaldı

---

## TS-05: MediBot AI Sohbet

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Metin sorusu | Türkçe yanıt |
| 2 | Ses: "Bugün ilaçlarımı içtim mi?" | Alım özeti |
| 3 | Fotoğraf + not → Gönder | Önizleme, sonra analiz |
| 4 | Yanıt | Yapılandırılmış bilgi |

**SS:** `TS-05-*.png` · **Sonuç:** ☐ Geçti ☐ Kaldı

---

## TS-06: Profil ve Uyum İstatistikleri

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Ad kaydet | Başarı |
| 2 | Bu ay uyum % + seri | Sayısal değerler |
| 3 | SKA 3 kartı | Açıklama metni |
| 4 | AI yedek anahtar | X/Y bilgisi |

**SS:** `TS-06-*.png` · **Sonuç:** ☐ Geçti ☐ Kaldı

---

## TS-07: Aile Takip Paneli

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Aile Üyesi Davet Et | Link modal |
| 2 | PC tarayıcısında panel | Panel açılır |
| 3 | Mobilde alındı → panel yenile | Senkron yeşil |
| 4 | Supabase caregivers + dose_logs | Kayıtlar |

**SS:** `TS-07-*.png` · **Sonuç:** ☐ Geçti ☐ Kaldı

---

## TS-08: Çoklu Platform

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Expo Go mobil | Tab bar çalışır |
| 2 | Web panel tarayıcı | Panel çalışır |
| 3 | İçerik taşması yok | Ekrana sığar |

**SS:** `TS-08-*.png` · **Sonuç:** ☐ Geçti ☐ Kaldı

---

## TS-09: Bildirimler

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | İlaç ekle, izin ver | İzin alındı |
| 2 | Hatırlatma saati | Bildirim / planlandı |

**SS:** `TS-09-*.png` · **Sonuç:** ☐ Geçti ☐ Kaldı

---

## Test Özeti

| Senaryo | Durum | Not |
|---------|-------|-----|
| TS-01 | | |
| TS-02 | | |
| TS-03 | | |
| TS-04 | | |
| TS-05 | | |
| TS-06 | | |
| TS-07 | | |
| TS-08 | | |
| TS-09 | | |

**Test eden:** _______________  
**Tarih:** _______________
