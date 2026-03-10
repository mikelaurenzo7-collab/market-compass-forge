'use client';

import { useEffect, useState, useCallback } from 'react';
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

function StatusDot({ status }: { status: string }) {
  return <span className={`status-dot ${status}`} title={status} />;
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${color}`}>{value}</div>
    </div>
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

  return (
    <AppShell>
      <header className="page-header-row">
        <div>
          <h1 className="page-title">Command Center</h1>
          <p className="page-subtitle">
            Autonomous operators across trading, ecommerce &amp; social — with 5-layer safety.
          </p>
        </div>
        <div className="page-actions">
          <Link href="/bots/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            + New Bot
          </Link>
        </div>
      </header>

      {fetching ? (
        <>
          <section className="stats-grid">
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-line w-40" />
                <div className="skeleton-line h-xl w-60" />
              </div>
            ))}
          </section>
          <div className="bot-grid">
            {[1,2,3].map(i => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-line w-80" />
                <div className="skeleton-line w-40" />
              </div>
            ))}
          </div>
        </>
      ) : (
        <section className="stats-grid">
          <StatCard label="Active Bots" value={String(runningBots.length)} color="green" />
          <StatCard label="Total Bots" value={String(data.bots.length)} color="blue" />
          <StatCard label="Connected Platforms" value={String(data.connectedPlatforms.length)} color="gold" />
          <StatCard label="Safety" value="Active" color="green" />
        </section>
      )}

      {!fetching && data.bots.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">◈</div>
          <div className="empty-state-title">No bots yet</div>
          <div className="empty-state-desc">Create your first autonomous operator to get started.</div>
          <Link href="/bots/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Create Your First Bot
          </Link>
        </div>
      )}

      {/* Trading Bots */}
      {tradingBots.length > 0 && (
        <>
          <h2 className="section-title">
            Trading Operators <span className="badge trading">{tradingBots.filter(b => b.status === 'running').length} running</span>
          </h2>
          <div className="bot-grid">
            {tradingBots.map((bot) => (
              <Link href={`/bots/${bot.id}`} key={bot.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="bot-card">
                  <div className="bot-card-header">
                    <div>
                      <div className="bot-name">{bot.name}</div>
                      <div className="bot-platform">{bot.platform}</div>
                    </div>
                    <StatusDot status={bot.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Store Bots */}
      {storeBots.length > 0 && (
        <>
          <h2 className="section-title">
            Store Operators <span className="badge store">{storeBots.filter(b => b.status === 'running').length} running</span>
          </h2>
          <div className="bot-grid">
            {storeBots.map((bot) => (
              <Link href={`/bots/${bot.id}`} key={bot.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="bot-card store">
                  <div className="bot-card-header">
                    <div>
                      <div className="bot-name">{bot.name}</div>
                      <div className="bot-platform">{bot.platform}</div>
                    </div>
                    <StatusDot status={bot.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Social Bots */}
      {socialBots.length > 0 && (
        <>
          <h2 className="section-title">
            Social Operators <span className="badge social">{socialBots.filter(b => b.status === 'running').length} running</span>
          </h2>
          <div className="bot-grid">
            {socialBots.map((bot) => (
              <Link href={`/bots/${bot.id}`} key={bot.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="bot-card social">
                  <div className="bot-card-header">
                    <div>
                      <div className="bot-name">{bot.name}</div>
                      <div className="bot-platform">{bot.platform}</div>
                    </div>
                    <StatusDot status={bot.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Quick Connect */}
      {data.connectedPlatforms.length === 0 && !fetching && (
        <>
          <h2 className="section-title">Get Connected</h2>
          <div className="empty-state">
            <div className="empty-state-icon">⊕</div>
            <div className="empty-state-title">No platforms connected</div>
            <div className="empty-state-desc">Connect your first platform to enable bot creation.</div>
            <Link href="/integrations" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              Connect a Platform
            </Link>
          </div>
        </>
      )}
    </AppShell>
  );
}
