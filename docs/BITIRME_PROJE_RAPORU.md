# MediRemind — Bitirme Projesi Raporu

**Proje Adı:** MediRemind — Akıllı İlaç Hatırlatma ve Takip Uygulaması  
**Platform:** React Native (Expo) — Mobil (iOS/Android) + Web  
**Veritabanı:** PostgreSQL (Supabase)  
**Tarih:** 2026

---

## Proje Özeti

MediRemind, kullanıcıların ilaçlarını zamanında almasını sağlayan, yapay zeka destekli bir mobil sağlık asistanıdır. Uygulama; ilaç hatırlatma, günlük alım takibi, ilaç kutusu tarama (bilgisayar görüsü), AI sohbet asistanı (MediBot), uyum istatistikleri ve aile bağlantıları sunar.

---

## Rubrik Karşılama Tablosu

| Kriter | Durum |
|--------|-------|
| 1.1 Çoklu Platform  | ✅ Mobil + Web |
| 1.2 Veritabanı  | ✅ PostgreSQL (Supabase) |
| 1.3 Yazılım Yaşam Döngüsü | ✅ Belgelendi |
| 1.4 SKA İlişkilendirme |✅ SKA 3 |
| 2.1 Yapay Zeka | ✅ Gemini AI |
| 2.2 Bilgisayar Görüsü |  ✅ İlaç kutusu tanıma |


---

## 1. Zorunlu Gereksinimler

### 1.1 Çoklu Platform Kullanımı 


- **Mobil:** Expo Go ile iOS ve Android'de native deneyim
- **Web:** `npm run web` ile tarayıcıda çalışır
- **Tek kod tabanı:** React Native + Expo Router
- **Platform optimizasyonları:**
  - `SafeAreaProvider` ile çentik/gesture bar desteği
  - `KeyboardAvoidingView` ile giriş ekranları
  - Platform bazlı bildirim izinleri

**Demo:** `npx expo start` → `w` (web) veya QR ile mobil

---

### 1.2 Veritabanı Kullanımı


**Sistem:** Supabase (PostgreSQL)

**Tablolar:**

| Tablo | Açıklama |
|-------|----------|
| `profiles` | Kullanıcı profil bilgileri |
| `medications` | İlaç adı, doz, saatler, frekans |
| `medication_intake_logs` | Günlük alım kayıtları (taken/bekliyor) |
| `medicine_scans` | AI tarama geçmişi (JSONB) |
| `family_connections` | Aile üyesi bağlantıları |

**İlişkiler:**
- `profiles.id` → `auth.users.id` (1:1)
- `medications.user_id` → `auth.users.id` (1:N)
- `medication_intake_logs.medication_id` → `medications.id` (N:1)
- `medicine_scans.user_id` → `auth.users.id` (1:N)
- `family_connections.owner_id` → `auth.users.id` (1:N)

**Güvenlik:** Row Level Security (RLS) — her kullanıcı yalnızca kendi verisine erişir.

**Şema dosyaları:** `supabase/schema.sql`, `supabase/migrations/`

---

### 1.3 Yazılım Yaşam Döngüsü 



| Aşama | Uygulama | Belge |
|-------|----------|-------|
| **Analiz** | İlaç uyumsuzluğu problemi, kullanıcı ihtiyaçları | Bu rapor, Bölüm 1 |
| **Tasarım** | Tab navigasyon, veritabanı şeması, servis katmanı | `supabase/schema.sql`, klasör yapısı |
| **Geliştirme** | Expo + TypeScript, modüler mimari | `screens/`, `services/`, `components/` |
| **Test** | Manuel test senaryoları | `docs/TEST_SENARYOLARI.md` |
| **Dağıtım** | Expo build, `.env` yapılandırması | `README.md` |

**Mimari:**
```
app/ (Expo Router) → screens/ (UI) → services/ (iş mantığı) → Supabase API
                                  → aiService (Gemini API)
```

---

### 1.4 BM Sürdürülebilir Kalkınma Amaçları — SKA 3 

**SKA 3: Sağlık ve Kaliteli Yaşam**

MediRemind'in SKA 3'e katkıları:

1. **İlaç uyumu artışı:** Günlük checkbox takibi ve hatırlatmalar
2. **Erken müdahale:** AI ile ilaç etkileşimi ve yan etki bilgilendirmesi
3. **Erişilebilir sağlık:** Sesli asistan ile yaşlı/düşük görme kullanıcı desteği
4. **Aile desteği:** Yakınların uyum takibi (family_connections)
5. **Ölçülebilir etki:** Aylık uyum yüzdesi ve günlük seri (streak)

Uygulama içinde Profil ekranında SKA 3 kartı gösterilir.

---

## 2. Seçmeli Konular

### 2.1 Yapay Zeka 

**Teknoloji:** Google Gemini 2.5 Flash API

**Kullanım alanları:**

| Özellik | Açıklama |
|---------|----------|
| MediBot sohbet | İlaç etkileşimleri, genel sağlık soruları |
| Ses tanıma | Konuşmayı metne çevirme (`transcribeAudioRaw`) |
| Sesli yanıt | "Bugün ilaçlarımı içtim mi?" → TTS (`expo-speech`) |
| Niyet sınıflandırma | `classifyIntent` — alım sorgusu / ilaç ekleme / genel |
| İlaç formu doldurma | Ses → JSON parse (`parseTextToMedicationJSON`) |
| API key rotasyonu | 10 anahtar ile kota yönetimi |

**Dosya:** `services/aiService.ts`, `screens/Medibot/MedibotScreen.tsx`

---

### 2.2 Bilgisayar Görüsü 

**Teknoloji:** Gemini Vision API + `expo-image-picker`

**Kullanım alanları:**

| Özellik | Açıklama |
|---------|----------|
| İlaç kutusu tanıma | Fotoğraftan ilaç adı, etken madde, yan etkiler |
| Yapılandırılmış JSON | `MedicineInfo` tipinde kart görünümü |
| Tarama geçmişi | `medicine_scans` tablosuna kayıt |
| Görsel vurgular | Yan etkiler (sarı), etkileşimler (kırmızı) |

**Dosya:** `services/aiService.ts` → `identifyMedicineBox`, `screens/Medication/MedicineInfoScreen.tsx`

---

### 2.3 Web Servisleri (Ek — sunumda belirtilebilir)

- **Supabase REST API:** Auth, CRUD, RLS
- **Google Generative Language API:** AI işlemleri
- **Expo Notifications API:** Yerel push bildirimler

---

## 3. Sunum Demo Akışı (Önerilen)

1. **Kayıt / Giriş** — Auth ekranı
2. **İlaç Ekle** — Manuel veya sesle (AI)
3. **Ana Sayfa** — Checkbox ile alım işaretleme, ilerleme çubuğu
4. **İlaçlarım** — Aktif ilaçlar ve saatler
5. **Tara** — Kutu fotoğrafı → AI analiz kartları
6. **MediBot** — "Parol alkolle içilir mi?" + sesli "Bugün ilaçlarımı içtim mi?"
7. **Profil** — Uyum %, seri, SKA 3, aile bağlantısı

---

## 4. Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Frontend | React Native, Expo 54, TypeScript |
| Routing | Expo Router (file-based) |
| Backend | Supabase (PostgreSQL + Auth) |
| AI | Google Gemini 2.5 Flash |
| Bildirim | expo-notifications |
| Ses | expo-av, expo-speech |

---

## 5. Dosya Referansları

- Veritabanı şeması: `supabase/schema.sql`
- Test senaryoları: `docs/TEST_SENARYOLARI.md`
- Kurulum: `README.md`
- AI servisi: `services/aiService.ts`
- Tarama ekranı: `screens/Medication/MedicineInfoScreen.tsx`
