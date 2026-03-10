'use client';

import { type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: '◈', href: '/' },
  { label: 'Trading Bots', icon: '⟁', href: '/bots?family=trading' },
  { label: 'Store Bots', icon: '⊞', href: '/bots?family=store' },
  { label: 'Social Bots', icon: '◉', href: '/bots?family=social' },
];

const SYSTEM_ITEMS = [
  { label: 'Safety', icon: '⛨', href: '/safety' },
  { label: 'Integrations', icon: '⊕', href: '/integrations' },
  { label: 'Settings', icon: '⚙', href: '/settings' },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    const basePath = href.split('?')[0];
    const hrefParams = new URLSearchParams(href.split('?')[1] ?? '');
    const family = hrefParams.get('family');
    if (family) {
      const currentParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      return pathname.startsWith(basePath) && currentParams.get('family') === family;
    }
    return pathname.startsWith(basePath);
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <Link href="/" className="sidebar-logo" style={{ textDecoration: 'none' }}>BeastBots</Link>

        <div className="sidebar-section">
          <div className="sidebar-label">Command Center</div>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">System</div>
          {SYSTEM_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {user && (
          <div className="sidebar-section" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-md)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0 var(--space-md)', marginBottom: 'var(--space-sm)' }}>
              {user.email}
            </div>
            <button
              onClick={handleLogout}
              className="sidebar-link"
              style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
            >
              <span>⏻</span>
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </nav>

      <main className="main-content">{children}</main>
    </div>
  );
}
