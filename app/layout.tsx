import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'ConnectFlow Operations Suite',
  description: 'Operations suite powered by ConnectFlow.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Debug logging for dev server startup
  if (process.env.NODE_ENV === 'development') {
    console.log('[RootLayout] Rendering layout at', new Date().toISOString());
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
