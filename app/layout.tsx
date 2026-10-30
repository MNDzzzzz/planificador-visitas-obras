import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Planificador de Visitas a Obras — Sistema Técnico',
  description:
    'Planificador inteligente de rutas y visitas a obras para técnicos de ingeniería con prevención de solapamientos y cálculo de tiempos de desplazamiento.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="bg-[#0B0C0E] text-[#F5F5F7] min-h-screen antialiased selection:bg-[#2997FF]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
