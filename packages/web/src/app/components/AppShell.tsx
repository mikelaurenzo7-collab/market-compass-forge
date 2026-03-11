'use client';

import { type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';

const BOT_NAV = [
  { label: 'Trading Bots', icon: '📈', href: '/bots?family=trading', family: 'trading' },
  { label: 'Store Bots', icon: '🛒', href: '/bots?family=store', family: 'store' },
  { label: 'Social Bots', icon: '📱', href: '/bots?family=social', family: 'social' },
  { label: 'Workforce Bots', icon: '⚙️', href: '/bots?family=workforce', family: 'workforce' },
];

const SYSTEM_ITEMS = [
  { label: 'Safety', icon: '🛡', href: '/safety' },
  { label: 'Integrations', icon: '🔌', href: '/integrations' },
  { label: 'Settings', icon: '⚙', href: '/settings' },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  // Get the current family from URL (only works client-side after hydration)
  const currentFamily = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('family')
    : null;

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    const basePath = href.split('?')[0];
    const hrefParams = new URLSearchParams(href.split('?')[1] ?? '');
    const family = hrefParams.get('family');
    if (family) {
      return pathname.startsWith(basePath) && currentFamily === family;
    }
    return pathname.startsWith(basePath);
  }

  function getActiveFamilyClass(href: string): string {
    const hrefParams = new URLSearchParams(href.split('?')[1] ?? '');
    const family = hrefParams.get('family');
    if (!family || !isActive(href)) return '';
    return family;
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
          <div className="sidebar-label">Overview</div>
          <Link
            href="/"
            className={`sidebar-link ${pathname === '/' ? 'active' : ''}`}
          >
            <span>◈</span>
            <span>Dashboard</span>
          </Link>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Bots</div>
          {BOT_NAV.map((item) => {
            const active = isActive(item.href);
            const familyClass = active ? item.family : '';
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`sidebar-link ${active ? `active ${familyClass}` : ''}`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
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
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0 var(--space-md)', marginBottom: 'var(--space-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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


