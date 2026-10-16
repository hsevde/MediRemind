import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-extrabold text-primary">MediRemind Aile Paneli</h1>
      <p className="max-w-md text-gray-600">
        Bu sayfaya davet linkinizle erişebilirsiniz. Mobil uygulamadan gönderilen panel
        linkini kullanın.
      </p>
      <p className="text-sm text-gray-400">Örnek: /panel?token=...</p>
    </main>
  );
}
