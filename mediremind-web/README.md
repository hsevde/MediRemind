# MediRemind Web — Aile Takip Paneli

Hasta yakınlarının ilaç durumunu **read-only** takip ettiği Next.js 14 paneli.

## Kurulum

```bash
cd mediremind-web
npm install
cp .env.local.example .env.local
# .env.local içine mobil uygulamayla AYNI Supabase URL ve anon key yaz
npm run dev
```

Panel: http://localhost:3000/panel?token=TOKEN

## Vercel Deploy

1. GitHub'a push et
2. Vercel → New Project → `mediremind-web` klasörü
3. Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy → `https://mediremind-web.vercel.app`

## Supabase Gereksinimleri

Ana projede çalıştır:

1. `supabase/migrations/003_caregivers_panel.sql` — caregivers, dose_logs, RPC
2. Edge function deploy: `supabase functions deploy send-caregiver-invite`
3. (Opsiyonel) Resend için `RESEND_API_KEY` secret

## Akış

1. Mobil → Profil → Aile Üyesi Ekle
2. Token + e-posta → `caregivers` tablosu
3. Aile üyesi linke tıklar → `/panel?token=...`
4. RPC `get_caregiver_panel_data` veriyi döner (anon, read-only)
