import { Suspense } from 'react';

import { PanelClient } from './PanelClient';

export const dynamic = 'force-dynamic';

function PanelLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-gray-500">Yükleniyor...</p>
    </main>
  );
}

export default function PanelPage() {
  return (
    <Suspense fallback={<PanelLoading />}>
      <PanelClient />
    </Suspense>
  );
}
