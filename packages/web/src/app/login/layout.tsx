import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Log In',
  description: 'Sign in to your BeastBots command center. Manage your trading bots, store operators, social media bots, and workforce automation.',
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
