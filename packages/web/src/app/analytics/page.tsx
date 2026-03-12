'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import {
  TrendingUp, ShoppingCart, Share2, Users, ArrowUpRight, ArrowDownRight,
  Activity, DollarSign, Target, Clock, Gauge,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import AppShell from '../components/AppShell';

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

/* ─── Mock data generators ─── */

function genTimeSeries(days: number, base: number, volatility: number, trend: number) {
  const data: { date: string; value: number }[] = [];
  let val = base;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    val = Math.max(0, val + trend + (Math.random() - 0.5) * volatility);
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.round(val * 100) / 100,
    });
  }
  return data;
}

function genHourlyData() {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    trades: Math.floor(Math.random() * 60 + 10),
    listings: Math.floor(Math.random() * 30 + 5),
    posts: Math.floor(Math.random() * 15 + 2),
    tasks: Math.floor(Math.random() * 20 + 3),
  }));
}

const FAMILY_COLORS: Record<string, string> = {
  trading: '#00e87b',
  store: '#3b82f6',
  social: '#8b5cf6',
  workforce: '#f59e0b',
};

const PERIODS = ['24H', '7D', '30D', '90D'] as const;
type Period = typeof PERIODS[number];

const customTooltipStyle = {
  background: '#12131a',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  fontSize: 12,
  color: '#e8eaf0',
};

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const [period, setPeriod] = useState<Period>('7D');

  const days = period === '24H' ? 1 : period === '7D' ? 7 : period === '30D' ? 30 : 90;

  const pnlData = useMemo(() => genTimeSeries(days, 1000, 80, 15), [days]);
  const actionsData = useMemo(() => genTimeSeries(days, 200, 40, 5), [days]);
  const hourlyData = useMemo(() => genHourlyData(), []);

  const successRate = 87.3;
  const avgLatency = 142;
  const totalPnl = pnlData.length > 1
    ? Math.round((pnlData[pnlData.length - 1].value - pnlData[0].value) * 100) / 100
    : 0;
  const pnlPercent = pnlData.length > 1
    ? Math.round(((pnlData[pnlData.length - 1].value - pnlData[0].value) / pnlData[0].value) * 10000) / 100
    : 0;

  const familyDistribution = [
    { name: 'Trading', value: 42, color: FAMILY_COLORS.trading },
    { name: 'Store', value: 28, color: FAMILY_COLORS.store },
    { name: 'Social', value: 18, color: FAMILY_COLORS.social },
    { name: 'Workforce', value: 12, color: FAMILY_COLORS.workforce },
  ];

  if (loading || !user) return null;

  return (
    <AppShell>
      <motion.div initial="hidden" animate="show" variants={stagger}>
        {/* Header */}
        <motion.header variants={fade} className="page-header-row">
          <div>
            <h1 className="page-title">Analytics</h1>
            <p className="page-subtitle">
              Performance metrics, execution data, and operator intelligence.
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
        <motion.section variants={fade} className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="stat-card" style={{ borderLeft: `3px solid ${totalPnl >= 0 ? 'var(--green)' : 'var(--red)'}` }}>
            <div className="stat-label">
              <DollarSign size={12} /> Total P&L
            </div>
            <div className="stat-value" style={{ color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)', fontSize: '1.5rem' }}>
              {totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString()}
            </div>
            <div className="stat-change" style={{ color: pnlPercent >= 0 ? 'var(--green)' : 'var(--red)', display: 'flex', alignItems: 'center', gap: 2 }}>
              {pnlPercent >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {Math.abs(pnlPercent)}%
            </div>
          </div>

          <div className="stat-card" style={{ borderLeft: '3px solid var(--green)' }}>
            <div className="stat-label">
              <Target size={12} /> Success Rate
            </div>
            <div className="stat-value" style={{ color: 'var(--green)', fontSize: '1.5rem' }}>
              {successRate}%
            </div>
            <div className="stat-change positive">
              <ArrowUpRight size={10} /> +1.2% from last period
            </div>
          </div>

          <div className="stat-card" style={{ borderLeft: '3px solid var(--blue)' }}>
            <div className="stat-label">
              <Activity size={12} /> Total Actions
            </div>
            <div className="stat-value" style={{ color: 'var(--blue)', fontSize: '1.5rem' }}>
              {actionsData[actionsData.length - 1]?.value.toLocaleString() ?? 0}
            </div>
            <div className="stat-change" style={{ color: 'var(--blue)' }}>
              Cumulative this period
            </div>
          </div>

          <div className="stat-card" style={{ borderLeft: '3px solid var(--purple)' }}>
            <div className="stat-label">
              <Clock size={12} /> Avg Latency
            </div>
            <div className="stat-value" style={{ color: 'var(--purple)', fontSize: '1.5rem' }}>
              {avgLatency}ms
            </div>
            <div className="stat-change positive">
              <ArrowDownRight size={10} /> -8ms improvement
            </div>
          </div>
        </motion.section>

        {/* Main charts row */}
        <motion.div variants={fade} className="charts-row">
          {/* P&L Chart */}
          <div className="chart-container">
            <div className="chart-header">
              <div>
                <div className="chart-title">Portfolio Value</div>
                <div className="chart-subtitle">Cumulative P&L across all trading bots</div>
              </div>
            </div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pnlData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00e87b" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#00e87b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#454860' }}
                    axisLine={false}
                    tickLine={false}
                    interval={Math.max(0, Math.floor(pnlData.length / 7))}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#454860' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#00e87b"
                    strokeWidth={2}
                    fill="url(#pnlGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Actions Chart */}
          <div className="chart-container">
            <div className="chart-header">
              <div>
                <div className="chart-title">Cumulative Actions</div>
                <div className="chart-subtitle">Total bot executions over time</div>
              </div>
            </div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={actionsData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="actionsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#454860' }}
                    axisLine={false}
                    tickLine={false}
                    interval={Math.max(0, Math.floor(actionsData.length / 7))}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#454860' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#actionsGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Hourly breakdown + family distribution */}
        <motion.div variants={fade} className="charts-row">
          {/* Hourly multi-line chart */}
          <div className="chart-container">
            <div className="chart-header">
              <div>
                <div className="chart-title">Hourly Breakdown</div>
                <div className="chart-subtitle">Actions per hour by operator family</div>
              </div>
            </div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="hour"
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
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Line type="monotone" dataKey="trades" stroke={FAMILY_COLORS.trading} strokeWidth={2} dot={false} name="Trading" />
                  <Line type="monotone" dataKey="listings" stroke={FAMILY_COLORS.store} strokeWidth={2} dot={false} name="Store" />
                  <Line type="monotone" dataKey="posts" stroke={FAMILY_COLORS.social} strokeWidth={2} dot={false} name="Social" />
                  <Line type="monotone" dataKey="tasks" stroke={FAMILY_COLORS.workforce} strokeWidth={2} dot={false} name="Workforce" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Family distribution pie + gauges */}
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
                  <Pie
                    data={familyDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {familyDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={customTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {familyDistribution.map((f) => (
                  <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: f.color, flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{f.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: f.color, marginLeft: 'auto' }}>
                      {f.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Performance gauges */}
        <motion.div variants={fade}>
          <h2 className="section-title" style={{ marginTop: 'var(--space-lg)' }}>
            <Gauge size={16} /> Performance Indicators
          </h2>
          <div className="gauge-grid">
            {[
              { label: 'Win Rate', value: '68.4%', color: 'var(--green)' },
              { label: 'Avg Trade', value: '+$24.50', color: 'var(--green)' },
              { label: 'Max Drawdown', value: '-4.2%', color: 'var(--red)' },
              { label: 'Sharpe Ratio', value: '1.84', color: 'var(--blue)' },
              { label: 'Listing Sync', value: '99.1%', color: 'var(--blue)' },
              { label: 'Post Reach', value: '12.4K', color: 'var(--purple)' },
              { label: 'Task Completion', value: '94.7%', color: 'var(--gold)' },
              { label: 'Uptime', value: '99.97%', color: 'var(--green)' },
            ].map((g) => (
              <motion.div key={g.label} variants={fade} className="gauge-card">
                <div className="gauge-value" style={{ color: g.color }}>{g.value}</div>
                <div className="gauge-label">{g.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}
