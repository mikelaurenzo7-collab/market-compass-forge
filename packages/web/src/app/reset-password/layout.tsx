import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Set a new password for your BeastBots account.',
};

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
