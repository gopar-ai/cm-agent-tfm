import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getBrand } from '@/lib/brand';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: `CM Agent · ${getBrand().name}`,
  description: 'Agente de community manager para LinkedIn',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} h-full bg-[#0f0f0f] antialiased`}>
        {children}
      </body>
    </html>
  );
}
