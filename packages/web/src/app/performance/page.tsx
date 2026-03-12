'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Trophy, TrendingUp, TrendingDown, Calendar, ArrowUpRight, ArrowDownRight,
  RefreshCw, Download, Star, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import AppShell from '../components/AppShell';
import LoadingScreen from '../components/LoadingScreen';

/* ─── Types (mirrors shared PerformanceReport) ─── */
interface BotRanking { percentile: number; label: string; sampleSize: number }
interface BotSnapshot {
  botId: string;
  botName: string;
  family: string;
  platform: string;
  strategy: string;
  grade: string;
  score: number;
  metrics: { totalTicks: number; successfulActions: number; failedActions: number; deniedActions: number; totalPnlUsd: number; uptimeMs: number };
  changes: { ticksChange: number; successRateChange: number; pnlChange: number };
  ranking: BotRanking | null;
  insights: string[];
}
interface PerformanceReport {
  id: string;
  tenantId: string;
  period: 'weekly' | 'monthly';
  fromMs: number;
  toMs: number;
  generatedAt: number;
  aggregate: { totalBots: number; activeBots: number; avgSuccessRate: number; totalPnlUsd: number; avgGrade: string };
  bots: BotSnapshot[];
  highlights: string[];
}
interface ReportListItem { id: string; period: string; fromMs: number; toMs: number; generatedAt: number }

/* ─── Helpers ─── */
const GRADE_COLORS: Record<string, string> = {
  A: '#00e87b', B: '#3b82f6', C: '#f59e0b', D: '#ff6b35', F: '#ff3b6b',
};
const FAMILY_COLORS: Record<string, string> = {
  trading: '#00e87b', store: '#3b82f6', social: '#8b5cf6', workforce: '#f59e0b',
};

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatPnl(usd: number) {
  const sign = usd >= 0 ? '+' : '';
  return `${sign}$${usd.toFixed(2)}`;
}

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

export default function PerformancePage() {
  const { user, loading, apiFetch } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [activeReport, setActiveReport] = useState<PerformanceReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [fetching, setFetching] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      const res = await apiFetch('/api/performance/reports');
      const json = await res.json();
      if (json.success) setReports(json.data);
    } catch { /* ignore */ } finally { setFetching(false); }
  }, [apiFetch]);

  const fetchReport = useCallback(async (id: string) => {
    try {
      const res = await apiFetch(`/api/performance/reports/${id}`);
      const json = await res.json();
      if (json.success) setActiveReport(json.data);
    } catch { /* ignore */ }
  }, [apiFetch]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    fetchReports();
  }, [user, loading, router, fetchReports]);

  async function generate(period: 'weekly' | 'monthly') {
    setGenerating(true);
    try {
      const res = await apiFetch('/api/performance/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      });
      const json = await res.json();
      if (json.success) {
        setActiveReport(json.data);
        fetchReports();
      }
    } catch { /* ignore */ } finally { setGenerating(false); }
  }

  if (loading || !user) return <LoadingScreen />;

  return (
    <AppShell>
      <motion.div initial="hidden" animate="show" variants={stagger}>

        {/* Header */}
        <motion.div variants={fade} className="page-header-row">
          <div>
            <h1 className="page-title"><Trophy size={22} style={{ marginRight: 8, verticalAlign: 'text-bottom', color: 'var(--gold)' }} />Performance Reports</h1>
            <p className="page-subtitle">Bot grades, benchmarks, and actionable insights</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button className="btn btn-secondary" disabled={generating} onClick={() => generate('weekly')}>
              {generating ? <RefreshCw size={14} className="spin" /> : <Calendar size={14} />}
              <span style={{ marginLeft: 6 }}>Weekly</span>
            </button>
            <button className="btn btn-primary" disabled={generating} onClick={() => generate('monthly')}>
              {generating ? <RefreshCw size={14} className="spin" /> : <Calendar size={14} />}
              <span style={{ marginLeft: 6 }}>Monthly</span>
            </button>
          </div>
        </motion.div>

        {/* Active Report */}
        {activeReport ? (
          <>
            {/* Summary Strip */}
            <motion.div variants={fade} className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
              <div className="stat-card">
                <div className="stat-label">Overall Grade</div>
                <div className="stat-value" style={{ color: GRADE_COLORS[activeReport.aggregate.avgGrade] ?? 'var(--text-primary)', fontSize: '2.5rem' }}>
                  {activeReport.aggregate.avgGrade}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Active Bots</div>
                <div className="stat-value">{activeReport.aggregate.activeBots} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ {activeReport.aggregate.totalBots}</span></div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Success Rate</div>
                <div className="stat-value">{activeReport.aggregate.avgSuccessRate.toFixed(1)}%</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total P&L</div>
                <div className="stat-value" style={{ color: activeReport.aggregate.totalPnlUsd >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {formatPnl(activeReport.aggregate.totalPnlUsd)}
                </div>
              </div>
            </motion.div>

            {/* Highlights */}
            {activeReport.highlights.length > 0 && (
              <motion.div variants={fade} className="settings-section" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="settings-section-title"><Star size={16} style={{ marginRight: 6, color: 'var(--gold)' }} />Highlights</div>
                <ul style={{ padding: '0 var(--space-lg)', listStyle: 'disc', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.8 }}>
                  {activeReport.highlights.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </motion.div>
            )}

            {/* Bot Cards */}
            <motion.div variants={fade} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-md)' }}>
              {activeReport.bots.map((bot) => (
                <div key={bot.botId} className="settings-section" style={{ padding: 'var(--space-lg)' }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 2 }}>{bot.botName}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span className="connect-badge connected" style={{ background: `${FAMILY_COLORS[bot.family]}20`, color: FAMILY_COLORS[bot.family] }}>{bot.family}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{bot.platform} · {bot.strategy}</span>
                      </div>
                    </div>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.5rem', fontWeight: 800,
                      color: GRADE_COLORS[bot.grade] ?? 'var(--text-primary)',
                      background: `${GRADE_COLORS[bot.grade] ?? '#fff'}15`,
                      border: `1px solid ${GRADE_COLORS[bot.grade] ?? '#fff'}30`,
                    }}>
                      {bot.grade}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Success Rate</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600 }}>
                        {bot.metrics.totalTicks > 0
                          ? ((bot.metrics.successfulActions / (bot.metrics.successfulActions + bot.metrics.failedActions) * 100) || 0).toFixed(1)
                          : '0.0'}%
                        {bot.changes.successRateChange !== 0 && (
                          <span style={{ fontSize: '0.75rem', marginLeft: 4, color: bot.changes.successRateChange > 0 ? 'var(--green)' : 'var(--red)' }}>
                            {bot.changes.successRateChange > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {Math.abs(bot.changes.successRateChange).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>P&amp;L</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: bot.metrics.totalPnlUsd >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {formatPnl(bot.metrics.totalPnlUsd)}
                        {bot.changes.pnlChange !== 0 && (
                          <span style={{ fontSize: '0.75rem', marginLeft: 4 }}>
                            {bot.changes.pnlChange > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {Math.abs(bot.changes.pnlChange).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ticks</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600 }}>{bot.metrics.totalTicks.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600 }}>{bot.score}/100</div>
                    </div>
                  </div>

                  {/* Benchmark Ranking */}
                  {bot.ranking && (
                    <div style={{
                      padding: 'var(--space-sm) var(--space-md)',
                      background: 'rgba(59, 130, 246, 0.06)',
                      borderRadius: 8,
                      marginBottom: 'var(--space-md)',
                      fontSize: '0.8rem',
                    }}>
                      <span style={{ color: 'var(--blue)' }}>Top {(100 - bot.ranking.percentile).toFixed(0)}%</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                        of {bot.ranking.sampleSize} {bot.family} bots · {bot.ranking.label}
                      </span>
                    </div>
                  )}

                  {/* Insights */}
                  {bot.insights.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-sm)' }}>
                      {bot.insights.map((insight, i) => (
                        <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 4 }}>
                          <AlertCircle size={10} style={{ marginRight: 4, verticalAlign: 'middle', opacity: 0.5 }} />
                          {insight}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </motion.div>

            {/* Report period label */}
            <motion.div variants={fade} style={{ textAlign: 'center', marginTop: 'var(--space-xl)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {activeReport.period === 'weekly' ? 'Weekly' : 'Monthly'} report &middot; {formatDate(activeReport.fromMs)} — {formatDate(activeReport.toMs)}
            </motion.div>
          </>
        ) : (
          /* Report List or Empty */
          <>
            {fetching ? (
              <motion.div variants={fade} style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-muted)' }}>Loading...</motion.div>
            ) : reports.length === 0 ? (
              <motion.div variants={fade} className="settings-section" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
                <Trophy size={40} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }} />
                <h3 style={{ marginBottom: 'var(--space-sm)' }}>No Reports Yet</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-lg)' }}>
                  Generate your first weekly or monthly performance report to see grades, benchmarks, and insights for every bot.
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
                  <button className="btn btn-primary" onClick={() => generate('weekly')}>Generate Weekly Report</button>
                  <button className="btn btn-secondary" onClick={() => generate('monthly')}>Generate Monthly Report</button>
                </div>
              </motion.div>
            ) : (
              <motion.div variants={fade}>
                <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                  {reports.map((r) => (
                    <button
                      key={r.id}
                      className="settings-section"
                      onClick={() => fetchReport(r.id)}
                      style={{
                        cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: 'var(--space-md) var(--space-lg)', border: 'none', background: 'var(--bg-card)', width: '100%', textAlign: 'left',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600 }}>{r.period === 'weekly' ? 'Weekly' : 'Monthly'} Report</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'var(--space-sm)' }}>
                          {formatDate(r.fromMs)} — {formatDate(r.toMs)}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(r.generatedAt)}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}

      </motion.div>
    </AppShell>
  );
}
