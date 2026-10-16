import type { WeekDay } from '@/lib/supabase';

const DAY_LABELS_TR: Record<string, string> = {
  Mon: 'Pzt',
  Tue: 'Sal',
  Wed: 'Çar',
  Thu: 'Per',
  Fri: 'Cum',
  Sat: 'Cmt',
  Sun: 'Paz',
};

const STATUS_COLORS = {
  complete: 'bg-green-500 border-green-600',
  missed: 'bg-red-500 border-red-600',
  partial: 'bg-yellow-400 border-yellow-500',
  empty: 'bg-gray-200 border-gray-300',
} as const;

type Props = {
  days: WeekDay[];
};

export function WeekCalendar({ days }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-gray-900">Haftalık Takvim</h2>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => (
          <div key={day.date} className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold text-gray-500">
              {DAY_LABELS_TR[day.label] ?? day.label}
            </span>
            <div
              className={`h-10 w-10 rounded-lg border-2 ${STATUS_COLORS[day.day_status]}`}
              title={day.day_status}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-green-500" /> Tümü alındı
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-red-500" /> En az biri kaçırıldı
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-yellow-400" /> Kısmi
        </span>
      </div>
    </div>
  );
}
