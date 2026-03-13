'use client';

import { useAuth } from '../lib/auth-context';
import DashboardPage from './dashboard-page';
import LandingPage from './landing-page';

export default function RootPage() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
        <p>Loading command center...</p>
      </main>
    );
  }
  return user ? <DashboardPage /> : <LandingPage />;
}
