import './styles.css';
import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '../lib/auth-context';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://beastbots.com';

export const viewport: Viewport = {
  themeColor: '#06070a',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'BeastBots — Autonomous Trading, Ecommerce, Social & Workforce Bots',
    template: '%s — BeastBots',
  },
  description:
    'Deploy AI-powered autonomous bots for crypto & equities trading, Shopify store optimization, social media growth, and workforce automation — with a 5-layer safety model, real-time analytics, and edge-native execution.',
  keywords: [
    'trading bot', 'crypto bot', 'AI trading', 'automated trading',
    'Shopify bot', 'ecommerce automation', 'pricing optimization',
    'social media bot', 'content automation', 'AI social media',
    'workforce automation', 'business automation', 'BeastBots',
    'Coinbase bot', 'Binance bot', 'Alpaca bot',
  ],
  authors: [{ name: 'BeastBots' }],
  creator: 'BeastBots',
  publisher: 'BeastBots',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'BeastBots',
    title: 'BeastBots — Autonomous Operators That Run Like Beasts',
    description:
      'Deploy AI-powered bots for trading, ecommerce, social media, and workforce automation. 5-layer safety model. 16 platforms. One command center.',
    url: SITE_URL,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BeastBots — Autonomous Bot Platform' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BeastBots — Autonomous Operators That Run Like Beasts',
    description:
      'AI-powered bots for trading, ecommerce, social media & workforce. 5-layer safety. 16 platforms. One dashboard.',
    images: ['/og-image.png'],
    creator: '@beastbots',
  },
  alternates: { canonical: SITE_URL },
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
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
