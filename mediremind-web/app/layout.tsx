import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MediRemind – Aile Paneli',
  description: 'Hasta ilaç takip paneli (read-only)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
