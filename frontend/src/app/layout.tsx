import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/ui/Sidebar';

export const metadata: Metadata = {
  title: 'EnergyFlow AI',
  description: 'Real-time energy analytics, forecasting, and battery optimisation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-950">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
