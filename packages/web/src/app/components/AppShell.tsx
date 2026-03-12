'use client';

import { type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import {
  LayoutDashboard,
  TrendingUp,
  ShoppingCart,
  Share2,
  Users,
  Shield,
  Plug,
  Settings,
  LogOut,
  BarChart3,
} from 'lucide-react';

const BOT_NAV = [
  { label: 'Trading', icon: <TrendingUp size={16} />, href: '/bots?family=trading', family: 'trading' },
  { label: 'Store', icon: <ShoppingCart size={16} />, href: '/bots?family=store', family: 'store' },
  { label: 'Social', icon: <Share2 size={16} />, href: '/bots?family=social', family: 'social' },
  { label: 'Workforce', icon: <Users size={16} />, href: '/bots?family=workforce', family: 'workforce' },
];

const SYSTEM_ITEMS = [
  { label: 'Analytics', icon: <BarChart3 size={16} />, href: '/analytics' },
  { label: 'Safety', icon: <Shield size={16} />, href: '/safety' },
  { label: 'Integrations', icon: <Plug size={16} />, href: '/integrations' },
  { label: 'Settings', icon: <Settings size={16} />, href: '/settings' },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

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

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <Link href="/" className="sidebar-logo" style={{ textDecoration: 'none' }}>
          BeastBots
        </Link>

        <div className="sidebar-section">
          <div className="sidebar-label">Overview</div>
          <Link
            href="/"
            className={`sidebar-link ${pathname === '/' ? 'active' : ''}`}
          >
            <LayoutDashboard size={16} className="nav-icon" />
            <span>Dashboard</span>
          </Link>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Operators</div>
          {BOT_NAV.map((item) => {
            const active = isActive(item.href);
            const familyClass = active ? item.family : '';
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`sidebar-link ${active ? `active ${familyClass}` : ''}`}
              >
                {item.icon}
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
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {user && (
          <div className="sidebar-section" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-md)' }}>
            <div style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              padding: '0 var(--space-sm)',
              marginBottom: 'var(--space-sm)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {user.email}
            </div>
            <button
              onClick={handleLogout}
              className="sidebar-link"
              style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </nav>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

