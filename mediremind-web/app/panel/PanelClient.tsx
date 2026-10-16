'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { MedCard } from '@/components/MedCard';
import { Navbar } from '@/components/Navbar';
import { StatCard } from '@/components/StatCard';
import { WeekCalendar } from '@/components/WeekCalendar';
import { fetchPanelData, minutesAgo, type PanelData } from '@/lib/supabase';

function InvalidPanel({ detail }: { detail?: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-8 text-center">
      <span className="text-5xl">🔗</span>
      <h1 className="text-2xl font-extrabold text-gray-900">Bu link geçersiz veya süresi dolmuş</h1>
      <p className="max-w-md text-gray-500">
        Panel linkinin doğru olduğundan emin olun veya hastadan yeni bir davet isteyin.
      </p>
      {detail ? (
        <p className="max-w-lg rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
          {detail}
        </p>
      ) : null}
    </main>
  );
}

function LoadingPanel() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-gray-500">Panel yükleniyor...</p>
      </div>
    </main>
  );
}

export function PanelClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [data, setData] = useState<PanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | undefined>();

  const load = useCallback(
    async (silent = false) => {
      if (!token) {
        setInvalid(true);
        setErrorDetail('URL sonunda ?token=... parametresi olmalı.');
        setLoading(false);
        return;
      }

      if (!silent) setLoading(true);

      const result = await fetchPanelData(token);
      if (!result.ok) {
        setInvalid(true);
        setData(null);
        setErrorDetail(result.message);
      } else {
        setInvalid(false);
        setErrorDetail(undefined);
        setData(result.data);
      }

      setLoading(false);
    },
    [token]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => load(true), 60_000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading && !data) return <LoadingPanel />;
  if (invalid || !data) return <InvalidPanel detail={errorDetail} />;

  const notificationText = data.next_notification.includes('saat')
    ? `${data.next_notification} ilacı alınmadığında sana bildirim gönderilecek.`
    : data.next_notification;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar caregiverEmail={data.caregiver_email} />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{data.patient_name}</h1>
            <p className="text-sm text-gray-500">Son güncelleme: {minutesAgo(data.last_updated)}</p>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            className="rounded-lg border border-primary/30 bg-white px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-light"
          >
            Yenile
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="Bugünkü İlerleme"
            value={`${data.today_taken}/${data.today_total}`}
            subtitle="Alınan / Toplam doz"
          />
          <StatCard
            title="Bu Hafta Kaçırılan"
            value={String(data.week_missed)}
            subtitle="Kaçırılan doz"
          />
          <StatCard
            title="Bu Ay Uyum"
            value={`%${data.month_adherence_percent}`}
            subtitle="Aylık uyum oranı"
          />
          <StatCard
            title="Aktif İlaç"
            value={String(data.medications_count)}
            subtitle="Kayıtlı ilaç sayısı"
          />
        </div>

        <section>
          <h2 className="mb-3 text-lg font-bold text-gray-900">Bugünkü İlaçlar</h2>
          {data.doses.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-500">
              Henüz kayıtlı ilaç yok.
            </p>
          ) : (
            <div className="space-y-3">
              {data.doses.map((dose) => (
                <MedCard key={`${dose.medication_id}_${dose.scheduled_time}`} dose={dose} />
              ))}
            </div>
          )}
        </section>

        <WeekCalendar days={data.week_days} />

        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
          <strong>Bildirim:</strong> {notificationText}
        </div>

        <p className="pb-8 text-center text-xs text-gray-400">
          Bu panel salt okunurdur · Otomatik yenileme: 60 saniye
        </p>
      </main>
    </div>
  );
}
