# MediRemind 💊

Akıllı ilaç hatırlatma ve takip uygulaması — Bitirme Projesi

## Özellikler

- 📱 **Mobil + Web** — Expo ile çoklu platform
- 💊 **İlaç yönetimi** — Çoklu saat, hatırlatma bildirimleri
- ✅ **Günlük takip** — Alındı/alınmadı checkbox'ları
- 📷 **AI tarama** — İlaç kutusu bilgisayar görüsü ile tanıma
- 🤖 **MediBot** — Yapay zeka sohbet + sesli yanıt
- 📊 **Uyum istatistikleri** — Aylık % ve günlük seri
- 👨‍👩‍👧 **Aile bağlantıları**
- 🌍 **SKA 3** — Sağlık ve Kaliteli Yaşam hedefi

## Seçmeli Konular (Rubrik)

1. **Yapay Zeka** — Gemini AI (sohbet, ses, niyet analizi)
2. **Bilgisayar Görüsü** — İlaç kutusu fotoğraf analizi

## Kurulum

```bash
npm install
cp .env.example .env   # Supabase + Gemini anahtarlarını doldur
npx expo start
```

### Veritabanı

Supabase SQL Editor'da sırayla çalıştır:
1. `supabase/schema.sql`
2. `supabase/migrations/001_medicine_scans.sql`
3. `supabase/migrations/002_intake_family.sql`

## Çalıştırma

| Platform | Komut |
|----------|-------|
| Mobil | `npx expo start` → QR okut |
| Android | `npm run android` |
| Web | `npm run web` |

## Belgeler (Sunum için)

- **Proje raporu (rubrik):** [`docs/BITIRME_PROJE_RAPORU.md`](docs/BITIRME_PROJE_RAPORU.md)
- **Test senaryoları:** [`docs/TEST_SENARYOLARI.md`](docs/TEST_SENARYOLARI.md)
- **Veritabanı şeması:** [`supabase/schema.sql`](supabase/schema.sql)

## Klasör Yapısı

```
app/           Expo Router (tabs, auth, stack)
screens/       Ekran bileşenleri
components/    UI bileşenleri
services/      Supabase, AI, bildirim servisleri
constants/     Tema renkleri
supabase/      SQL şema ve migration
docs/          Bitirme projesi belgeleri
```

## Sunum Demo Sırası

1. Giriş → 2. İlaç ekle → 3. Ana sayfa checkbox → 4. Tara (AI) → 5. MediBot soru → 6. Profil (SKA + uyum %)

## Teknolojiler

React Native · Expo 54 · TypeScript · Supabase (PostgreSQL) · Google Gemini AI
