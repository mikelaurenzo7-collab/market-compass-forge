'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import {
  TrendingUp, ShoppingCart, Share2, Users, ArrowUpRight, ArrowDownRight,
  Activity, DollarSign, Target, Clock, Gauge, Bot,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import AppShell from '../components/AppShell';
import LoadingScreen from '../components/LoadingScreen';

/* ─── types ─── */
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
interface TimeseriesBucket {
  ts: number;
  trading: number;
  store: number;
  social: number;
  workforce: number;
  success: number;
  fail: number;
}
interface PnlSnapshot { ts: number; pnlUsd: number }
interface PerBotMetric {
  botId: string;
  name: string;
  family: string;
  platform: string;
  totalTicks: number;
  successfulActions: number;
  failedActions: number;
  deniedActions: number;
  totalPnlUsd: number;
  uptimeMs: number;
}

/* ─── constants ─── */
const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

const FAMILY_COLORS: Record<string, string> = {
  trading: '#00e87b', store: '#3b82f6', social: '#8b5cf6', workforce: '#f59e0b',
};
const FAMILY_LABELS: Record<string, string> = {
  trading: 'Trading', store: 'Store', social: 'Social', workforce: 'Workforce',
};

const PERIODS = ['24H', '7D', '30D', '90D'] as const;
type Period = typeof PERIODS[number];
const PERIOD_MAP: Record<Period, string> = { '24H': '24h', '7D': '7d', '30D': '30d', '90D': '90d' };

const tooltipStyle = {
  background: '#12131a',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  fontSize: 12,
  color: '#e8eaf0',
};

function formatUptime(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  return `${(ms / 86_400_000).toFixed(1)}d`;
}

export default function AnalyticsPage() {
  const { user, loading, apiFetch, onboardingRequired } = useAuth();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('7D');
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesBucket[]>([]);
  const [pnlSnapshots, setPnlSnapshots] = useState<PnlSnapshot[]>([]);
  const [perBot, setPerBot] = useState<PerBotMetric[]>([]);
  const [fetching, setFetching] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [sumRes, tsRes, pbRes] = await Promise.all([
        apiFetch('/api/analytics/summary'),
        apiFetch(`/api/analytics/timeseries?period=${PERIOD_MAP[period]}`),
        apiFetch('/api/analytics/per-bot'),
      ]);
      const [sumJson, tsJson, pbJson] = await Promise.all([
        sumRes.json(), tsRes.json(), pbRes.json(),
      ]);
      if (sumJson.success) setSummary(sumJson.data);
      if (tsJson.success) {
        setTimeseries(tsJson.data?.activity ?? []);
        setPnlSnapshots(tsJson.data?.pnlSnapshots ?? []);
      }
      if (pbJson.success) setPerBot(pbJson.data ?? []);
    } catch { /* API may not be available */ }
    setFetching(false);
  }, [apiFetch, period]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    if (onboardingRequired) { router.push('/onboarding'); return; }
    setFetching(true);
    fetchAll();
    const interval = setInterval(fetchAll, 10_000);
    return () => clearInterval(interval);
  }, [user, loading, onboardingRequired, router, fetchAll]);

  if (loading || !user) return <LoadingScreen />;

  const m = summary?.metrics;
  const totalBots = summary?.bots.total ?? 0;
  const singleBot = totalBots === 1;
  const hasBots = totalBots > 0;

  // Chart data
  const pnlChartData = pnlSnapshots.map((s) => ({
    date: new Date(s.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: Math.round(s.pnlUsd * 100) / 100,
  }));

  const actionChartData = timeseries.map((b) => ({
    date: new Date(b.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' }),
    total: b.trading + b.store + b.social + b.workforce,
    success: b.success,
    fail: b.fail,
  }));

  const hourlyData = timeseries.map((b) => ({
    hour: new Date(b.ts).toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }),
    trading: b.trading,
    store: b.store,
    social: b.social,
    workforce: b.workforce,
  }));

  // Family distribution from real per-bot data
  const familyCounts: Record<string, number> = {};
  perBot.forEach((b) => {
    const total = b.successfulActions + b.failedActions;
    familyCounts[b.family] = (familyCounts[b.family] ?? 0) + total;
  });
  const totalFamilyActions = Object.values(familyCounts).reduce((a, b) => a + b, 0) || 1;
  const familyDistribution = Object.entries(familyCounts).map(([family, count]) => ({
    name: FAMILY_LABELS[family] ?? family,
    value: Math.round((count / totalFamilyActions) * 100),
    color: FAMILY_COLORS[family] ?? '#888',
  }));
  const activeFamilies = Object.keys(familyCounts);

  // Performance indicators from real data
  const successRate = m?.successRate ?? 0;
  const totalActions = m?.totalActions ?? 0;
  const totalPnl = m?.totalPnlUsd ?? 0;
  const uptimeStr = formatUptime(m?.totalUptimeMs ?? 0);

  // Per-bot performance for gauges
  const topBot = perBot.length > 0
    ? perBot.reduce((best, b) => b.totalPnlUsd > best.totalPnlUsd ? b : best, perBot[0])
    : null;

  const avgActionsPerBot = perBot.length > 0
    ? Math.round(totalActions / perBot.length)
    : 0;

  const safetyBlockRate = totalActions > 0
    ? Math.round(((m?.deniedActions ?? 0) / totalActions) * 1000) / 10
    : 0;

  return (
    <AppShell>
      <motion.div initial="hidden" animate="show" variants={stagger}>
        <motion.header variants={fade} className="page-header-row">
          <div>
            <h1 className="page-title">Analytics</h1>
            <p className="page-subtitle">
              {singleBot
                ? `Performance metrics for ${perBot[0]?.name ?? 'your operator'}`
                : 'Performance metrics, execution data, and operator intelligence.'
              }
            </p>
          </div>
          <div className="chart-period-selector">
            {PERIODS.map((p) => (
              <button
                key={p}
                className={`chart-period-btn ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </motion.header>

        {/* KPI Cards */}
        {fetching ? (
          <section className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton-card"><div className="skeleton-line w-40" /><div className="skeleton-line h-xl w-60" /></div>
            ))}
          </section>
        ) : (
          <motion.section variants={fade} className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="stat-card" style={{ borderLeft: `3px solid ${totalPnl >= 0 ? 'var(--green)' : 'var(--red)'}` }}>
              <div className="stat-label"><DollarSign size={12} /> Total P&L</div>
              <div className="stat-value" style={{ color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)', fontSize: '1.5rem' }}>
                {totalPnl >= 0 ? '+' : ''}${Math.abs(totalPnl).toLocaleString()}
              </div>
              <div className="stat-change" style={{ color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)', display: 'flex', alignItems: 'center', gap: 2 }}>
                {totalPnl >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {m?.totalTicks ?? 0} ticks executed
              </div>
            </div>

            <div className="stat-card" style={{ borderLeft: '3px solid var(--green)' }}>
              <div className="stat-label"><Target size={12} /> Success Rate</div>
              <div className="stat-value" style={{ color: 'var(--green)', fontSize: '1.5rem' }}>
                {successRate}%
              </div>
              <div className="stat-change positive">
                {m?.successfulActions ?? 0} of {totalActions} actions
              </div>
            </div>

            <div className="stat-card" style={{ borderLeft: '3px solid var(--blue)' }}>
              <div className="stat-label"><Activity size={12} /> Total Actions</div>
              <div className="stat-value" style={{ color: 'var(--blue)', fontSize: '1.5rem' }}>
                {totalActions.toLocaleString()}
              </div>
              <div className="stat-change" style={{ color: 'var(--blue)' }}>
                {m?.deniedActions ?? 0} safety blocks
              </div>
            </div>

            <div className="stat-card" style={{ borderLeft: '3px solid var(--purple)' }}>
              <div className="stat-label"><Clock size={12} /> Uptime</div>
              <div className="stat-value" style={{ color: 'var(--purple)', fontSize: '1.5rem' }}>
                {uptimeStr}
              </div>
              <div className="stat-change" style={{ color: 'var(--purple)' }}>
                {summary?.bots.running ?? 0} of {totalBots} bots active
              </div>
            </div>
          </motion.section>
        )}

        {/* P&L + Actions charts */}
        {!fetching && hasBots && (
          <motion.div variants={fade} className="charts-row">
            <div className="chart-container">
              <div className="chart-header">
                <div>
                  <div className="chart-title">{singleBot ? `${perBot[0]?.name} P&L` : 'Portfolio Value'}</div>
                  <div className="chart-subtitle">Cumulative P&L {singleBot ? '' : 'across all bots'}</div>
                </div>
              </div>
              <div style={{ height: 240 }}>
                {pnlChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={pnlChartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                      <defs>
                        <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00e87b" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#00e87b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#454860' }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(pnlChartData.length / 7))} />
                      <YAxis tick={{ fontSize: 10, fill: '#454860' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${v}`, 'P&L']} />
                      <Area type="monotone" dataKey="value" stroke="#00e87b" strokeWidth={2} fill="url(#pnlGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <div style={{ textAlign: 'center' }}><DollarSign size={32} style={{ opacity: 0.2, marginBottom: 8 }} /><div>P&L data will appear as bots execute trades</div></div>
                  </div>
                )}
              </div>
            </div>

            <div className="chart-container">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Action Flow</div>
                  <div className="chart-subtitle">Success vs failure over time</div>
                </div>
              </div>
              <div style={{ height: 240 }}>
                {actionChartData.length > 0 && actionChartData.some(d => d.total > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={actionChartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#454860' }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(actionChartData.length / 6))} />
                      <YAxis tick={{ fontSize: 10, fill: '#454860' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="success" fill="#00e87b" stackId="a" radius={[0, 0, 0, 0]} name="Success" opacity={0.8} />
                      <Bar dataKey="fail" fill="#ef4444" stackId="a" radius={[3, 3, 0, 0]} name="Failed" opacity={0.8} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <div style={{ textAlign: 'center' }}><Activity size={32} style={{ opacity: 0.2, marginBottom: 8 }} /><div>Action data will appear here</div></div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Hourly + Distribution */}
        {!fetching && hasBots && (
          <motion.div variants={fade} className="charts-row">
            <div className="chart-container">
              <div className="chart-header">
                <div>
                  <div className="chart-title">{singleBot ? 'Activity Timeline' : 'Hourly Breakdown'}</div>
                  <div className="chart-subtitle">{singleBot ? 'Actions over time' : 'Actions per hour by operator family'}</div>
                </div>
              </div>
              <div style={{ height: 240 }}>
                {hourlyData.length > 0 && hourlyData.some(d => d.trading + d.store + d.social + d.workforce > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hourlyData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#454860' }} axisLine={false} tickLine={false} interval={3} />
                      <YAxis tick={{ fontSize: 10, fill: '#454860' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      {activeFamilies.includes('trading') && <Line type="monotone" dataKey="trading" stroke={FAMILY_COLORS.trading} strokeWidth={2} dot={false} name="Trading" />}
                      {activeFamilies.includes('store') && <Line type="monotone" dataKey="store" stroke={FAMILY_COLORS.store} strokeWidth={2} dot={false} name="Store" />}
                      {activeFamilies.includes('social') && <Line type="monotone" dataKey="social" stroke={FAMILY_COLORS.social} strokeWidth={2} dot={false} name="Social" />}
                      {activeFamilies.includes('workforce') && <Line type="monotone" dataKey="workforce" stroke={FAMILY_COLORS.workforce} strokeWidth={2} dot={false} name="Workforce" />}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <div style={{ textAlign: 'center' }}><Clock size={32} style={{ opacity: 0.2, marginBottom: 8 }} /><div>Timeline data will appear as bots operate</div></div>
                  </div>
                )}
              </div>
            </div>

            {familyDistribution.length > 1 ? (
              <div className="chart-container">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Operator Mix</div>
                    <div className="chart-subtitle">Actions distribution by family</div>
                  </div>
                </div>
                <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ResponsiveContainer width="50%" height="100%">
                    <PieChart>
                      <Pie data={familyDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                        {familyDistribution.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {familyDistribution.map((f) => (
                      <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: f.color, flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{f.name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: f.color, marginLeft: 'auto' }}>{f.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : familyDistribution.length === 1 ? (
              <div className="chart-container">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Bot Details</div>
                    <div className="chart-subtitle">Per-bot performance breakdown</div>
                  </div>
                </div>
                <div style={{ padding: 'var(--space-md)' }}>
                  {perBot.map((b) => (
                    <div key={b.botId} style={{ padding: 'var(--space-sm) 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.name}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: b.totalPnlUsd >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {b.totalPnlUsd >= 0 ? '+' : ''}${b.totalPnlUsd.toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-md)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <span>{b.successfulActions + b.failedActions} actions</span>
                        <span>{b.totalTicks} ticks</span>
                        <span>{formatUptime(b.uptimeMs)} uptime</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </motion.div>
        )}

        {/* Performance Indicators */}
        {!fetching && hasBots && (
          <motion.div variants={fade}>
            <h2 className="section-title" style={{ marginTop: 'var(--space-lg)' }}>
              <Gauge size={16} /> Performance Indicators
            </h2>
            <div className="gauge-grid">
              <motion.div variants={fade} className="gauge-card">
                <div className="gauge-value" style={{ color: 'var(--green)' }}>{successRate}%</div>
                <div className="gauge-label">Success Rate</div>
              </motion.div>
              <motion.div variants={fade} className="gauge-card">
                <div className="gauge-value" style={{ color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {totalPnl >= 0 ? '+' : ''}${Math.abs(totalPnl).toLocaleString()}
                </div>
                <div className="gauge-label">Total P&L</div>
              </motion.div>
              <motion.div variants={fade} className="gauge-card">
                <div className="gauge-value" style={{ color: 'var(--blue)' }}>{totalActions.toLocaleString()}</div>
                <div className="gauge-label">Total Actions</div>
              </motion.div>
              <motion.div variants={fade} className="gauge-card">
                <div className="gauge-value" style={{ color: 'var(--purple)' }}>{uptimeStr}</div>
                <div className="gauge-label">Total Uptime</div>
              </motion.div>
              <motion.div variants={fade} className="gauge-card">
                <div className="gauge-value" style={{ color: safetyBlockRate > 5 ? 'var(--red)' : 'var(--green)' }}>{safetyBlockRate}%</div>
                <div className="gauge-label">Safety Block Rate</div>
              </motion.div>
              <motion.div variants={fade} className="gauge-card">
                <div className="gauge-value" style={{ color: 'var(--blue)' }}>{avgActionsPerBot}</div>
                <div className="gauge-label">Avg Actions/Bot</div>
              </motion.div>
              <motion.div variants={fade} className="gauge-card">
                <div className="gauge-value" style={{ color: 'var(--green)' }}>{m?.totalTicks?.toLocaleString() ?? 0}</div>
                <div className="gauge-label">Total Ticks</div>
              </motion.div>
              {topBot && (
                <motion.div variants={fade} className="gauge-card">
                  <div className="gauge-value" style={{ color: topBot.totalPnlUsd >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {topBot.totalPnlUsd >= 0 ? '+' : ''}${Math.abs(topBot.totalPnlUsd).toLocaleString()}
                  </div>
                  <div className="gauge-label">Top Bot P&L</div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {!fetching && !hasBots && (
          <motion.div variants={fade} className="empty-state" style={{ marginTop: 'var(--space-xl)' }}>
            <div className="empty-state-icon"><Bot size={64} style={{ opacity: 0.2 }} /></div>
            <div className="empty-state-title">No analytics data yet</div>
            <div className="empty-state-desc">Deploy your first bot to start seeing real performance metrics here.</div>
          </motion.div>
        )}
      </motion.div>
    </AppShell>
  );
}
