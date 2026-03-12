import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bot Templates',
  description: 'Browse pre-built bot templates for trading, ecommerce, social media, and workforce automation. Deploy in under 60 seconds.',
  openGraph: {
    title: 'Bot Templates — BeastBots',
    description: 'One-click deploy pre-configured trading, store, social, and workforce bots.',
  },
};

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
