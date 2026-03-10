'use client';

import { useAuth } from '../lib/auth-context';
import DashboardPage from './dashboard-page';
import LandingPage from './landing-page';

export default function RootPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <DashboardPage /> : <LandingPage />;
}
