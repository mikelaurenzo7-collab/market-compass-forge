import './styles.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { AuthProvider } from '../lib/auth-context';

export const metadata: Metadata = {
  title: 'BeastBots — Command Center',
  description: 'Autonomous operators for trading, ecommerce, and social.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
