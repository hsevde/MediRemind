import type { PanelDose } from '@/lib/supabase';

const STATUS_STYLES = {
  taken: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  missed: 'bg-red-100 text-red-800 border-red-200',
} as const;

const STATUS_LABELS = {
  taken: 'Alındı',
  pending: 'Bekleniyor',
  missed: 'Kaçırıldı',
} as const;

type Props = {
  dose: PanelDose;
};

export function MedCard({ dose }: Props) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-lg font-bold text-gray-900">{dose.name}</h3>
        <p className="text-sm text-gray-500">
          {dose.dose} · {dose.scheduled_time}
        </p>
      </div>
      <span
        className={`rounded-full border px-3 py-1 text-xs font-bold ${STATUS_STYLES[dose.status]}`}
      >
        {STATUS_LABELS[dose.status]}
      </span>
    </div>
  );
}
