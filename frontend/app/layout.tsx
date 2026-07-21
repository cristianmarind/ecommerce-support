import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Soporte ImagineApps',
  description: 'Módulo de soporte de e-commerce con IA y agentes humanos',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen text-slate-900">{children}</body>
    </html>
  );
}
