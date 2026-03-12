import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Sign Up — Start Automating for Free',
  description: 'Create your BeastBots account. Deploy AI-powered trading bots, ecommerce operators, social media bots, and workforce automation in minutes.',
};

export default function SignupLayout({ children }: { children: ReactNode }) {
  return children;
}
