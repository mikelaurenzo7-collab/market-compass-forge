import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Pricing — Plans for Trading, Store, Social & Workforce Bots',
  description:
    'Flexible tiered pricing for BeastBots autonomous operators. Starter, Pro, and Enterprise plans for trading bots, ecommerce automation, social media bots, and workforce pods.',
  openGraph: {
    title: 'BeastBots Pricing — Plans That Scale With You',
    description:
      'Starter from $0/mo. Pro from $149/mo. Enterprise from $499/mo. Multi-family discounts available. Start in paper mode free.',
  },
};

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children;
}
