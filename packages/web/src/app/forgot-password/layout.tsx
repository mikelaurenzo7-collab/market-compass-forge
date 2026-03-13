import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset your BeastBots account password. Enter your email to receive a secure reset link.',
};

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
