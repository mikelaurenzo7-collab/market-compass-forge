'use client';

import AppShell from './AppShell';

export default function LoadingScreen() {
  return (
    <AppShell>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', flexDirection: 'column', gap: 'var(--space-md)',
      }}>
        <div className="loading-spinner" />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading...</p>
      </div>
    </AppShell>
  );
}
