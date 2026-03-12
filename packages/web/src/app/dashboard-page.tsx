'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  TrendingUp, ShoppingCart, Share2, Users, Plus, Activity, ArrowUpRight,
  Shield, Zap, Bot, Clock,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import AppShell from './components/AppShell';

/* ─── types ─── */
interface BotSummary {
  id: string;
  name: string;
  family: string;
  platform: string;
  status: string;
}

interface SummaryMetrics {
  totalTicks: number;
  successfulActions: number;
  failedActions: number;
  deniedActions: number;
  totalPnlUsd: number;
  totalUptimeMs: number;
  successRate: number;
  totalActions: number;
}

interface SummaryData {
  bots: { total: number; running: number; byFamily: Record<string, { total: number; running: number }> };
  metrics: SummaryMetrics;
  connectedPlatforms: number;
}

interface ActivityItem {
  source: string;
  id: string;
  botId?: string;
  platform?: string;
  action: string;
  result: string;
  riskLevel?: string;
  durationMs?: number;
  timestamp: number;
}

interface TimeseriesBucket {
  ts: number;
  trading: number;
  store: number;
  social: number;
  workforce: number;
  success: number;
  fail: number;
}

/* ─── constants ─── */
const FAMILY_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string; cssVar: string }> = {
  trading: { icon: <TrendingUp size={16} />, color: '#00e87b', label: 'Trading', cssVar: 'var(--color-trading)' },
  store: { icon: <ShoppingCart size={16} />, color: '#3b82f6', label: 'Store', cssVar: 'var(--color-store)' },
  social: { icon: <Share2 size={16} />, color: '#8b5cf6', label: 'Social', cssVar: 'var(--color-social)' },
  workforce: { icon: <Users size={16} />, color: '#f59e0b', label: 'Workforce', cssVar: 'var(--color-workforce)' },
};

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

const ACTIVITY_TYPE_MAP: Record<string, 'success' | 'info' | 'warning'> = {
  success: 'success', allowed: 'success', executed: 'success',
  denied: 'warning', blocked: 'warning', error: 'warning',
};

function StatusDot({ status }: { status: string }) {
  return <span className={`status-dot ${status}`} title={status} />;
}

function formatUptime(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  return `${(ms / 86_400_000).toFixed(1)}d`;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
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
                    fontSize: '0.65rem', fontWeight: 600,
                    color: bot.status === 'running' ? 'var(--green)' : 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
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
  const [bots, setBots] = useState<BotSummary[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [timeseries, setTimeseries] = useState<TimeseriesBucket[]>([]);
  const [fetching, setFetching] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const [botsRes, summaryRes, activityRes, tsRes] = await Promise.all([
        apiFetch('/api/bots'),
        apiFetch('/api/analytics/summary'),
        apiFetch('/api/analytics/activity?limit=15'),
        apiFetch('/api/analytics/timeseries?period=24h'),
      ]);
      const [botsJson, summaryJson, activityJson, tsJson] = await Promise.all([
        botsRes.json(), summaryRes.json(), activityRes.json(), tsRes.json(),
      ]);
      setBots(botsJson.data ?? []);
      if (summaryJson.success) setSummary(summaryJson.data);
      if (activityJson.success) setActivity(activityJson.data ?? []);
      if (tsJson.success) setTimeseries(tsJson.data?.activity ?? []);
    } catch { /* API may not be running */ }
    setFetching(false);
  }, [apiFetch]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    if (onboardingRequired) { router.push('/onboarding'); return; }
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 5_000);
    return () => clearInterval(interval);
  }, [user, loading, onboardingRequired, router, fetchDashboard]);

  if (loading || !user) return null;

  const runningBots = bots.filter((b) => b.status === 'running');
  const hasBots = bots.length > 0;
  const m = summary?.metrics;
  const singleBot = bots.length === 1;
  const activeFamilies = Object.keys(summary?.bots.byFamily ?? {});

  // Chart data from real timeseries
  const chartData = timeseries.map((b) => ({
    h: new Date(b.ts).toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }),
    v: b.trading + b.store + b.social + b.workforce,
  }));

  // Build stat cards — adapt for single-bot users
  function buildStatCards() {
    if (!summary) return [];

    if (singleBot) {
      const bot = bots[0];
      const cfg = FAMILY_CONFIG[bot.family];
      return [
        { key: 'status', label: 'Bot Status', value: bot.status === 'running' ? 'Live' : bot.status.charAt(0).toUpperCase() + bot.status.slice(1), color: bot.status === 'running' ? 'var(--green)' : 'var(--text-secondary)', sub: `${cfg?.label ?? bot.family} · ${bot.platform}`, icon: cfg?.icon ?? <Bot size={16} /> },
        { key: 'actions', label: 'Total Actions', value: (m?.totalActions ?? 0).toLocaleString(), color: 'var(--blue)', sub: `${m?.successRate ?? 0}% success rate`, icon: <Activity size={16} /> },
        { key: 'pnl', label: 'P&L', value: `${(m?.totalPnlUsd ?? 0) >= 0 ? '+' : ''}$${(m?.totalPnlUsd ?? 0).toLocaleString()}`, color: (m?.totalPnlUsd ?? 0) >= 0 ? 'var(--green)' : 'var(--red)', sub: `${m?.totalTicks ?? 0} ticks executed`, icon: <TrendingUp size={16} /> },
        { key: 'uptime', label: 'Uptime', value: formatUptime(m?.totalUptimeMs ?? 0), color: 'var(--purple)', sub: `${m?.deniedActions ?? 0} safety blocks`, icon: <Clock size={16} /> },
      ];
    }

    if (activeFamilies.length <= 4 && activeFamilies.length > 0) {
      return activeFamilies.map((family) => {
        const fc = summary.bots.byFamily[family];
        const cfg = FAMILY_CONFIG[family];
        return { key: family, label: cfg?.label ?? family, value: String(fc?.total ?? 0), color: cfg?.cssVar ?? 'var(--text-primary)', sub: `${fc?.running ?? 0} running`, icon: cfg?.icon ?? <Bot size={16} /> };
      });
    }

    return [
      { key: 'bots', label: 'Total Bots', value: String(summary.bots.total), color: 'var(--green)', sub: `${summary.bots.running} running`, icon: <Bot size={16} /> },
      { key: 'actions', label: 'Total Actions', value: (m?.totalActions ?? 0).toLocaleString(), color: 'var(--blue)', sub: `${m?.successRate ?? 0}% success`, icon: <Activity size={16} /> },
      { key: 'pnl', label: 'P&L', value: `${(m?.totalPnlUsd ?? 0) >= 0 ? '+' : ''}$${(m?.totalPnlUsd ?? 0).toLocaleString()}`, color: (m?.totalPnlUsd ?? 0) >= 0 ? 'var(--green)' : 'var(--red)', sub: `${m?.totalTicks ?? 0} ticks`, icon: <TrendingUp size={16} /> },
      { key: 'uptime', label: 'Uptime', value: formatUptime(m?.totalUptimeMs ?? 0), color: 'var(--purple)', sub: `${m?.deniedActions ?? 0} blocked`, icon: <Clock size={16} /> },
    ];
  }

  const statCards = buildStatCards();

  return (
    <AppShell>
      <motion.div initial="hidden" animate="show" variants={stagger}>
        <motion.header variants={fade} className="page-header-row">
          <div>
            <h1 className="page-title">Command Center</h1>
            <p className="page-subtitle">
              {singleBot ? `Live view of ${bots[0]?.name ?? 'your operator'}` : 'Real-time overview of your autonomous operators'}
            </p>
          </div>
          <div className="page-actions">
            <Link href="/bots/create" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> New Bot
            </Link>
          </div>
        </motion.header>

        <motion.div variants={fade} className="health-bar">
          <div className={`health-indicator ${runningBots.length > 0 ? 'healthy' : 'degraded'}`} />
          <div className="health-text" style={{ color: runningBots.length > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
            {runningBots.length > 0 ? 'All Systems Operational' : hasBots ? 'No Active Bots' : 'Ready to Deploy'}
          </div>
          <div className="health-meta">
            <div className="health-meta-item"><Zap size={12} style={{ color: 'var(--green)' }} /><span>{runningBots.length} active</span></div>
            <div className="health-meta-item"><Shield size={12} style={{ color: 'var(--green)' }} /><span>Safety armed</span></div>
            <div className="health-meta-item"><Activity size={12} /><span>{summary?.connectedPlatforms ?? 0} platform{(summary?.connectedPlatforms ?? 0) !== 1 ? 's' : ''}</span></div>
          </div>
        </motion.div>

        {fetching ? (
          <section className="stats-grid">
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton-card"><div className="skeleton-line w-40" /><div className="skeleton-line h-xl w-60" /></div>
            ))}
          </section>
        ) : hasBots ? (
          <motion.section variants={fade} className="stats-grid">
            {statCards.map((s) => (
              <motion.div key={s.key} variants={fade} className={`stat-card ${s.key}-accent`}>
                <div className="stat-label">{s.icon}<span>{s.label}</span></div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-change" style={{ color: s.color }}>{s.sub}</div>
              </motion.div>
            ))}
          </motion.section>
        ) : null}

        {!fetching && hasBots && (
          <motion.div variants={fade} className="charts-row">
            <div className="chart-container">
              <div className="chart-header">
                <div>
                  <div className="chart-title">{singleBot ? `${bots[0]?.name} Activity` : 'Bot Activity'}</div>
                  <div className="chart-subtitle">
                    Actions per hour (last 24h)
                    {m && m.totalActions > 0 && (<> · <strong style={{ color: 'var(--green)' }}>{m.totalActions}</strong> total</>)}
                  </div>
                </div>
              </div>
              <div style={{ height: 200 }}>
                {chartData.length > 0 && chartData.some(d => d.v > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                      <XAxis dataKey="h" tick={{ fontSize: 10, fill: '#454860' }} axisLine={false} tickLine={false} interval={3} />
                      <YAxis tick={{ fontSize: 10, fill: '#454860' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#12131a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} formatter={(value) => [String(value), 'Actions']} />
                      <Bar dataKey="v" fill="#00e87b" radius={[3, 3, 0, 0]} opacity={0.8} name="Actions" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <Activity size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
                      <div>No activity yet — start your bot to see live data</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="activity-feed">
              <div className="activity-header">
                <Activity size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                Recent Activity
              </div>
              <div className="activity-list">
                {activity.length === 0 ? (
                  <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Activity will appear here as your bots operate.
                  </div>
                ) : (
                  activity.slice(0, 10).map((item) => {
                    const type = ACTIVITY_TYPE_MAP[item.result] ?? 'info';
                    return (
                      <div key={`${item.source}-${item.id}`} className="activity-item">
                        <div className={`activity-dot ${type}`} />
                        <div className="activity-content">
                          <div className="activity-title">{item.action.replace(/_/g, ' ')}</div>
                          <div className="activity-time">{item.result} · {timeAgo(item.timestamp)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}

        {!fetching && !hasBots && (
          <motion.div variants={fade} className="empty-state" style={{ marginTop: 'var(--space-xl)' }}>
            <div className="empty-state-icon" style={{ fontSize: '3rem', opacity: 0.2 }}><Activity size={64} /></div>
            <div className="empty-state-title">No bots yet</div>
            <div className="empty-state-desc">Deploy your first autonomous operator to see it in action.</div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/bots/create" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Create Your First Bot</Link>
              <Link href="/integrations" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Connect Platforms</Link>
            </div>
          </motion.div>
        )}

        {!fetching && hasBots && (
          <>
            {activeFamilies.map((family) => (
              <FamilyBotSection key={family} family={family} bots={bots.filter(b => b.family === family)} />
            ))}
          </>
        )}
      </motion.div>
    </AppShell>
  );
}
