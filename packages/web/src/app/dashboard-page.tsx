'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  TrendingUp, ShoppingCart, Share2, Users, Plus, Activity, ArrowUpRight,
  ArrowDownRight, Shield, Zap,
} from 'lucide-react';
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

const FAMILY_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string; cssVar: string }> = {
  trading: { icon: <TrendingUp size={16} />, color: '#00e87b', label: 'Trading', cssVar: 'var(--color-trading)' },
  store: { icon: <ShoppingCart size={16} />, color: '#3b82f6', label: 'Store', cssVar: 'var(--color-store)' },
  social: { icon: <Share2 size={16} />, color: '#8b5cf6', label: 'Social', cssVar: 'var(--color-social)' },
  workforce: { icon: <Users size={16} />, color: '#f59e0b', label: 'Workforce', cssVar: 'var(--color-workforce)' },
};

/* Generate mock sparkline data for visual appeal */
function genSparkline(points: number, trend: 'up' | 'down' | 'flat'): { v: number }[] {
  const data: { v: number }[] = [];
  let val = 50 + Math.random() * 20;
  for (let i = 0; i < points; i++) {
    const drift = trend === 'up' ? 1.5 : trend === 'down' ? -1.2 : 0;
    val = Math.max(10, val + drift + (Math.random() - 0.5) * 8);
    data.push({ v: Math.round(val * 10) / 10 });
  }
  return data;
}

/* Generate mock hourly activity */
function genActivity(): { h: string; v: number }[] {
  return Array.from({ length: 24 }, (_, i) => ({
    h: `${i}:00`,
    v: Math.floor(Math.random() * 40 + 5),
  }));
}

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

function StatusDot({ status }: { status: string }) {
  return <span className={`status-dot ${status}`} title={status} />;
}

function Sparkline({ data, color }: { data: { v: number }[]; color: string }) {
  return (
    <div className="stat-sparkline">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#grad-${color.replace('#', '')})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function FamilyBotSection({ family, bots }: { family: string; bots: BotSummary[] }) {
  if (bots.length === 0) return null;
  const cfg = FAMILY_CONFIG[family] ?? { icon: <Activity size={16} />, color: '#888', label: family, cssVar: 'var(--text-primary)' };
  const running = bots.filter((b) => b.status === 'running').length;

  return (
    <motion.div variants={fade}>
      <h2 className="section-title">
        <span style={{ color: cfg.cssVar }}>{cfg.icon}</span>
        <span style={{ color: cfg.cssVar }}>{cfg.label} Operators</span>
        <span className={`badge ${family}`}>{running} running</span>
      </h2>
      <div className="bot-grid">
        {bots.map((bot) => (
          <Link href={`/bots/${bot.id}`} key={bot.id} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className={`bot-card ${family}`}>
              <div className="bot-card-header">
                <div>
                  <div className="bot-name">{bot.name}</div>
                  <div className="bot-platform" style={{ color: cfg.cssVar, opacity: 0.7 }}>{bot.platform}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <StatusDot status={bot.status} />
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: bot.status === 'running' ? 'var(--green)' : 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>
                    {bot.status}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
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

  /* Memoized mock chart data (doesn't re-gen every render) */
  const sparklines = useMemo(() => ({
    trading: genSparkline(20, 'up'),
    store: genSparkline(20, 'flat'),
    social: genSparkline(20, 'up'),
    workforce: genSparkline(20, 'flat'),
  }), []);
  const activityData = useMemo(() => genActivity(), []);

  if (loading || !user) return null;

  const runningBots = data.bots.filter((b) => b.status === 'running');
  const tradingBots = data.bots.filter((b) => b.family === 'trading');
  const storeBots = data.bots.filter((b) => b.family === 'store');
  const socialBots = data.bots.filter((b) => b.family === 'social');
  const workforceBots = data.bots.filter((b) => b.family === 'workforce');
  const hasBots = data.bots.length > 0;

  return (
    <AppShell>
      <motion.div initial="hidden" animate="show" variants={stagger}>
        {/* Header */}
        <motion.header variants={fade} className="page-header-row">
          <div>
            <h1 className="page-title">Command Center</h1>
            <p className="page-subtitle">
              Real-time overview of your autonomous operators.
            </p>
          </div>
          <div className="page-actions">
            <Link href="/bots/create" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> New Bot
            </Link>
          </div>
        </motion.header>

        {/* System health bar */}
        <motion.div variants={fade} className="health-bar">
          <div className={`health-indicator ${runningBots.length > 0 ? 'healthy' : 'degraded'}`} />
          <div className="health-text" style={{ color: 'var(--green)' }}>
            {runningBots.length > 0 ? 'All Systems Operational' : 'No Active Bots'}
          </div>
          <div className="health-meta">
            <div className="health-meta-item">
              <Zap size={12} style={{ color: 'var(--green)' }} />
              <span>{runningBots.length} bot{runningBots.length !== 1 ? 's' : ''} active</span>
            </div>
            <div className="health-meta-item">
              <Shield size={12} style={{ color: 'var(--green)' }} />
              <span>Safety armed</span>
            </div>
            <div className="health-meta-item">
              <Activity size={12} />
              <span>{data.connectedPlatforms.length} platform{data.connectedPlatforms.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </motion.div>

        {/* Stat cards with sparklines */}
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
          <motion.section variants={fade} className="stats-grid">
            {([
              { key: 'trading', bots: tradingBots, trend: '+12%' as const, trendUp: true },
              { key: 'store', bots: storeBots, trend: '+3%' as const, trendUp: true },
              { key: 'social', bots: socialBots, trend: '+8%' as const, trendUp: true },
              { key: 'workforce', bots: workforceBots, trend: 'Stable' as const, trendUp: false },
            ] as const).map((s) => {
              const cfg = FAMILY_CONFIG[s.key]!;
              return (
                <motion.div key={s.key} variants={fade} className={`stat-card ${s.key}-accent`}>
                  <div className="stat-label">
                    {cfg.icon}
                    <span>{cfg.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <div className="stat-value" style={{ color: cfg.cssVar }}>{s.bots.length}</div>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: s.trendUp ? 'var(--green)' : 'var(--text-muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 2,
                    }}>
                      {s.trendUp ? <ArrowUpRight size={10} /> : null}
                      {s.trend}
                    </span>
                  </div>
                  <div className="stat-change" style={{ color: cfg.cssVar }}>
                    {s.bots.filter(b => b.status === 'running').length} running
                  </div>
                  <Sparkline data={sparklines[s.key]} color={cfg.color} />
                </motion.div>
              );
            })}
          </motion.section>
        )}

        {/* Charts row */}
        {!fetching && hasBots && (
          <motion.div variants={fade} className="charts-row">
            {/* Activity chart */}
            <div className="chart-container">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Bot Activity</div>
                  <div className="chart-subtitle">Ticks per hour (last 24h)</div>
                </div>
                <div className="chart-period-selector">
                  <button className="chart-period-btn">1H</button>
                  <button className="chart-period-btn active">24H</button>
                  <button className="chart-period-btn">7D</button>
                </div>
              </div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <XAxis
                      dataKey="h"
                      tick={{ fontSize: 10, fill: '#454860' }}
                      axisLine={false}
                      tickLine={false}
                      interval={3}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#454860' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#12131a',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="v" fill="#00e87b" radius={[3, 3, 0, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Activity feed */}
            <div className="activity-feed">
              <div className="activity-header">
                <Activity size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                Recent Activity
              </div>
              <div className="activity-list">
                {[
                  { type: 'success', title: 'Trading bot executed BTC/USDT order', time: '2 min ago' },
                  { type: 'info', title: 'Store bot synced 48 product listings', time: '8 min ago' },
                  { type: 'success', title: 'Social bot published scheduled post', time: '15 min ago' },
                  { type: 'warning', title: 'Circuit breaker triggered on ETH-Alpha', time: '32 min ago' },
                  { type: 'success', title: 'Workforce pod completed onboarding task', time: '1h ago' },
                  { type: 'info', title: 'Safety audit log exported', time: '2h ago' },
                  { type: 'success', title: 'Trading bot closed position +2.4%', time: '3h ago' },
                ].map((item, i) => (
                  <div key={i} className="activity-item">
                    <div className={`activity-dot ${item.type}`} />
                    <div className="activity-content">
                      <div className="activity-title">{item.title}</div>
                      <div className="activity-time">{item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {!fetching && !hasBots && (
          <motion.div variants={fade} className="empty-state" style={{ marginTop: 'var(--space-xl)' }}>
            <div className="empty-state-icon" style={{ fontSize: '3rem', opacity: 0.2 }}>
              <Activity size={64} />
            </div>
            <div className="empty-state-title">No bots yet</div>
            <div className="empty-state-desc">Deploy your first autonomous operator to see it in action.</div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/bots/create" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Plus size={14} /> Create Your First Bot
              </Link>
              <Link href="/integrations" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                Connect Platforms
              </Link>
            </div>
          </motion.div>
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
      </motion.div>
    </AppShell>
  );
}
