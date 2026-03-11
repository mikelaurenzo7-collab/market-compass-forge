'use client';

import { useEffect, useState, useCallback } from 'react';
import { callMcp } from '../lib/mcp';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';
import AppShell from './components/AppShell';

interface BotSummary {
  id: string;
  name: string;
  family: string;
  platform: string;
  status: string;
}

interface DashboardData {
  bots: BotSummary[];
  connectedPlatforms: string[];
}

const FAMILY_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  trading: { icon: '📈', color: 'var(--color-trading)', label: 'Trading' },
  store: { icon: '🛒', color: 'var(--color-store)', label: 'Store' },
  social: { icon: '📱', color: 'var(--color-social)', label: 'Social' },
  workforce: { icon: '⚙️', color: 'var(--color-workforce)', label: 'Workforce' },
};

function StatusDot({ status }: { status: string }) {
  return <span className={`status-dot ${status}`} title={status} />;
}

function FamilyBotSection({ family, bots }: { family: string; bots: BotSummary[] }) {
  if (bots.length === 0) return null;
  const cfg = FAMILY_CONFIG[family] ?? { icon: '◈', color: 'var(--text-primary)', label: family };
  const running = bots.filter((b) => b.status === 'running').length;

  return (
    <>
      <h2 className="section-title">
        <span>{cfg.icon}</span>
        <span style={{ color: cfg.color }}>{cfg.label} Operators</span>
        <span className={`badge ${family}`}>{running} running</span>
      </h2>
      <div className="bot-grid">
        {bots.map((bot) => (
          <Link href={`/bots/${bot.id}`} key={bot.id} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className={`bot-card ${family}`}>
              <div className="bot-card-header">
                <div>
                  <div className="bot-name">{bot.name}</div>
                  <div className="bot-platform" style={{ color: cfg.color, opacity: 0.8 }}>{bot.platform}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                  <StatusDot status={bot.status} />
                  <span style={{ fontSize: '0.65rem', color: bot.status === 'running' ? 'var(--green)' : 'var(--text-muted)' }}>
                    {bot.status}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
        <Link
          href={`/bots?family=${family}`}
          style={{ textDecoration: 'none' }}
        >
          <div style={{
            background: 'var(--bg-card)',
            border: `1px dashed ${cfg.color}40`,
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: cfg.color,
            fontSize: '0.85rem',
            fontWeight: 600,
            transition: 'all var(--transition-fast)',
            minHeight: 100,
          }}>
            View all {cfg.label} bots →
          </div>
        </Link>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { user, loading, apiFetch, onboardingRequired } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({ bots: [], connectedPlatforms: [] });
  const [fetching, setFetching] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const [botsRes, credsRes] = await Promise.all([
        apiFetch('/api/bots'),
        apiFetch('/api/credentials'),
      ]);
      const botsJson = await botsRes.json();
      const credsJson = await credsRes.json();
      setData({
        bots: botsJson.data ?? [],
        connectedPlatforms: (credsJson.data ?? []).map((c: any) => c.platform),
      });
    } catch {
      // API might not be running
    } finally {
      setFetching(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    if (onboardingRequired) { router.push('/onboarding'); return; }
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10_000);
    return () => clearInterval(interval);
  }, [user, loading, onboardingRequired, router, fetchDashboard]);

  if (loading || !user) return null;

  const runningBots = data.bots.filter((b) => b.status === 'running');
  const tradingBots = data.bots.filter((b) => b.family === 'trading');
  const storeBots = data.bots.filter((b) => b.family === 'store');
  const socialBots = data.bots.filter((b) => b.family === 'social');
  const workforceBots = data.bots.filter((b) => b.family === 'workforce');

  const hasBots = data.bots.length > 0;

  return (
    <AppShell>
      <header className="page-header-row">
        <div>
          <h1 className="page-title">Command Center</h1>
          <p className="page-subtitle">
            Your autonomous operators — trading, ecommerce, social, and workforce.
          </p>
          <button
            onClick={async () => {
              try {
                const resp = await callMcp({ name: 'operator_catalog' });
                console.log('MCP operator catalog', resp);
                alert(`Found ${resp.integrations.length} integrations (see console)`);
              } catch (e) {
                console.error('MCP call failed', e);
              }
            }}
            style={{ marginTop: 'var(--space-md)', padding: 'var(--space-sm)' }}
          >
            Query Operator Catalog
          </button>
        </div>
        <div className="page-actions">
          <Link href="/bots/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            + New Bot
          </Link>
        </div>
      </header>

      {/* Top-level stats */}
      {fetching ? (
        <section className="stats-grid">
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-line w-40" />
              <div className="skeleton-line h-xl w-60" />
            </div>
          ))}
        </section>
      ) : (
        <section className="stats-grid">
          <div className="stat-card trading-accent">
            <div className="stat-label">Trading Bots</div>
            <div className="stat-value" style={{ color: 'var(--color-trading)' }}>{tradingBots.length}</div>
            <div className="stat-change positive">{tradingBots.filter(b => b.status === 'running').length} running</div>
          </div>
          <div className="stat-card store-accent">
            <div className="stat-label">Store Bots</div>
            <div className="stat-value" style={{ color: 'var(--color-store)' }}>{storeBots.length}</div>
            <div className="stat-change" style={{ color: 'var(--color-store)' }}>{storeBots.filter(b => b.status === 'running').length} running</div>
          </div>
          <div className="stat-card social-accent">
            <div className="stat-label">Social Bots</div>
            <div className="stat-value" style={{ color: 'var(--color-social)' }}>{socialBots.length}</div>
            <div className="stat-change" style={{ color: 'var(--color-social)' }}>{socialBots.filter(b => b.status === 'running').length} running</div>
          </div>
          <div className="stat-card workforce-accent">
            <div className="stat-label">Workforce Bots</div>
            <div className="stat-value" style={{ color: 'var(--color-workforce)' }}>{workforceBots.length}</div>
            <div className="stat-change" style={{ color: 'var(--color-workforce)' }}>{workforceBots.filter(b => b.status === 'running').length} running</div>
          </div>
        </section>
      )}

      {/* System health strip */}
      {!fetching && hasBots && (
        <div style={{
          display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-2xl)',
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)', padding: 'var(--space-md) var(--space-lg)',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '1rem' }}>🛡</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Safety Active</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {runningBots.length} bot{runningBots.length !== 1 ? 's' : ''} operating ·{' '}
            {data.connectedPlatforms.length} platform{data.connectedPlatforms.length !== 1 ? 's' : ''} connected
          </span>
          <Link href="/safety" style={{ fontSize: '0.8rem', color: 'var(--green)', textDecoration: 'none', fontWeight: 600 }}>
            Safety Dashboard →
          </Link>
        </div>
      )}

      {/* Empty state */}
      {!fetching && !hasBots && (
        <div className="empty-state">
          <div className="empty-state-icon">◈</div>
          <div className="empty-state-title">No bots yet</div>
          <div className="empty-state-desc">Create your first autonomous operator to get started.</div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/bots/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>Create Your First Bot</Link>
            <Link href="/integrations" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Connect Platforms</Link>
          </div>
        </div>
      )}

      {/* Per-family bot sections */}
      {!fetching && (
        <>
          <FamilyBotSection family="trading" bots={tradingBots} />
          <FamilyBotSection family="store" bots={storeBots} />
          <FamilyBotSection family="social" bots={socialBots} />
          <FamilyBotSection family="workforce" bots={workforceBots} />
        </>
      )}

      {/* Connect prompt when no platforms */}
      {!fetching && data.connectedPlatforms.length === 0 && hasBots && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)', padding: 'var(--space-lg)',
          display: 'flex', alignItems: 'center', gap: 'var(--space-lg)',
        }}>
          <span style={{ fontSize: '1.5rem' }}>🔌</span>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>No platforms connected</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Connect trading exchanges, storefronts, or social accounts to activate live operation.
            </div>
          </div>
          <Link href="/integrations" className="btn btn-primary" style={{ textDecoration: 'none', marginLeft: 'auto', flexShrink: 0 }}>
            Connect
          </Link>
        </div>
      )}
    </AppShell>
  );
}
