'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  TrendingUp, ShoppingCart, Share2, Users, Play, Pause, Square,
  Trash2, AlertOctagon, ArrowLeft, Activity, Zap,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import AppShell from '../../components/AppShell';

interface BotDetail {
  id: string;
  name: string;
  family: string;
  platform: string;
  status: string;
  strategies: string[];
  config: Record<string, unknown>;
  createdAt: string;
}

interface BotMetrics {
  totalTicks: number;
  successfulActions: number;
  failedActions: number;
  deniedActions: number;
  totalPnlUsd: number;
  uptimeMs: number;
}

interface MetricsResponse {
  botId: string;
  family: string;
  status: string;
  heartbeat: string | null;
  metrics: BotMetrics;
}

interface DecisionEntry {
  botId: string;
  timestamp: number;
  action: string;
  result: string;
  details: Record<string, unknown>;
  durationMs: number;
}

const FAMILY_ICONS: Record<string, React.ReactNode> = {
  trading: <TrendingUp size={28} />,
  store: <ShoppingCart size={28} />,
  social: <Share2 size={28} />,
  workforce: <Users size={28} />,
};

function StatusDot({ status }: { status: string }) {
  return <span className={`status-dot ${status}`} title={status} />;
}

export default function BotDetailPage() {
  const { user, loading, apiFetch } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params.id as string;
  const [bot, setBot] = useState<BotDetail | null>(null);
  const [metricsData, setMetricsData] = useState<MetricsResponse | null>(null);
  const [decisions, setDecisions] = useState<DecisionEntry[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  const FAMILY_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    trading: { icon: <TrendingUp size={18} />, color: 'var(--color-trading)', label: 'Trading' },
    store: { icon: <ShoppingCart size={18} />, color: 'var(--color-store)', label: 'Store' },
    social: { icon: <Share2 size={18} />, color: 'var(--color-social)', label: 'Social' },
    workforce: { icon: <Users size={18} />, color: 'var(--color-workforce)', label: 'Workforce' },
  };


  const fetchBot = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/bots/${botId}`);
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setBot(json.data ?? json);
    } catch {
      setError('Failed to load bot');
    } finally {
      setFetching(false);
    }
    // Fetch metrics
    try {
      const res = await apiFetch(`/api/bots/${botId}/metrics`);
      const json = await res.json();
      if (json.success) setMetricsData(json.data ?? null);
    } catch { /* ignore */ }
    // Fetch decisions
    try {
      const res = await apiFetch(`/api/bots/${botId}/decisions`);
      const json = await res.json();
      if (json.success) setDecisions(json.data ?? []);
    } catch { /* ignore */ }
  }, [apiFetch, botId]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    fetchBot();
    const interval = setInterval(fetchBot, 5_000);
    return () => clearInterval(interval);
  }, [user, loading, router, fetchBot]);

  async function handleAction(action: string) {
    await apiFetch(`/api/bots/${botId}/${action}`, { method: 'POST' });
    fetchBot();
  }

  async function handleDelete() {
    if (!confirm('Delete this bot? This cannot be undone.')) return;
    await apiFetch(`/api/bots/${botId}`, { method: 'DELETE' });
    router.push('/bots');
  }

  if (loading || !user) return null;

  return (
    <AppShell>
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <Link href="/bots" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} /> Back to Bots
        </Link>
      </div>

      {fetching && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
          {[1,2].map(i => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-line w-40" />
              <div className="skeleton-line w-80" />
              <div className="skeleton-line w-60" />
            </div>
          ))}
        </div>
      )}
      {error && <div className="auth-error">{error}</div>}

      {bot && (
        <>
          {/* family banner */}
          <div className={`family-banner ${bot.family}`}>
            <span className="family-banner-icon" style={{ color: FAMILY_CONFIG[bot.family]?.color }}>
              {FAMILY_ICONS[bot.family]}
            </span>
            <div>
              <div className="family-banner-title" style={{ color: FAMILY_CONFIG[bot.family]?.color }}>
                {bot.name}
              </div>
              <div className="family-banner-desc">
                {bot.platform} · {FAMILY_CONFIG[bot.family]?.label} bot
              </div>
            </div>
          </div>

          <div className="page-header-row">
            <div>
              <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                {bot.name} <StatusDot status={bot.status} />
              </h1>
              <p className="page-subtitle">{bot.platform} · {bot.family}</p>
            </div>
            <div className="page-actions">
              {bot.status === 'running' ? (
                <>
                  <button className="btn btn-secondary" onClick={() => handleAction('pause')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Pause size={14} /> Pause
                  </button>
                  <button className="btn btn-danger" onClick={() => handleAction('stop')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Square size={14} /> Stop
                  </button>
                </>
              ) : bot.status === 'paused' ? (
                <>
                  <button className="btn btn-primary" onClick={() => handleAction('start')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Play size={14} /> Resume
                  </button>
                  <button className="btn btn-danger" onClick={() => handleAction('stop')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Square size={14} /> Stop
                  </button>
                </>
              ) : (
                <button className="btn btn-primary" onClick={() => handleAction('start')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Play size={14} /> Start
                </button>
              )}
              {bot.status === 'running' && (
                <button className="btn btn-danger" onClick={() => handleAction('kill')} title="Emergency kill switch" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <AlertOctagon size={14} /> Kill
                </button>
              )}
              {bot.status !== 'running' && (
                <button className="btn btn-danger" onClick={handleDelete} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
            {/* Strategies */}
            <div className="settings-section">
              <div className="settings-section-title">Strategies</div>
              {(() => {
                const strategies = bot.config?.strategies
                  ? (bot.config.strategies as string[])
                  : bot.config?.strategy
                    ? [bot.config.strategy as string]
                    : [];
                return strategies.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No strategies configured</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                    {strategies.map((s) => (
                      <span key={s} className="strategy-tag">{s.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Info */}
            <div className="settings-section">
              <div className="settings-section-title">Details</div>
              <div className="settings-row">
                <span className="settings-label">ID</span>
                <span className="settings-value">{bot.id}</span>
              </div>
              <div className="settings-row">
                <span className="settings-label">Status</span>
                <span className="settings-value">{bot.status}</span>
              </div>
              <div className="settings-row">
                <span className="settings-label">Created</span>
                <span className="settings-value">{new Date(bot.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Config */}
          {bot.config && Object.keys(bot.config).length > 0 && (
            <div className="settings-section" style={{ marginTop: 'var(--space-lg)' }}>
              <div className="settings-section-title">Configuration</div>
              {Object.entries(bot.config).filter(([k]) => k !== 'strategies' && k !== 'strategy').map(([key, value]) => (
                <div key={key} className="settings-row">
                  <span className="settings-label">{key.replace(/_/g, ' ')}</span>
                  <span className="settings-value">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Metrics */}
          {metricsData && (
            <div className="settings-section" style={{ marginTop: 'var(--space-lg)' }}>
              <div className="settings-section-title">Performance Metrics</div>
              <div className="stats-grid" style={{ marginBottom: 'var(--space-md)' }}>
                <div className="stat-card">
                  <div className="stat-label">Status</div>
                  <div className={`stat-value ${metricsData.status === 'running' ? 'green' : ''}`}>{metricsData.status}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Ticks</div>
                  <div className="stat-value blue">{metricsData.metrics.totalTicks.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">P&amp;L</div>
                  <div className={`stat-value ${metricsData.metrics.totalPnlUsd >= 0 ? 'green' : 'red'}`}>
                    {metricsData.metrics.totalPnlUsd >= 0 ? '+' : ''}${metricsData.metrics.totalPnlUsd.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Successful</div>
                  <div className="stat-value green">{metricsData.metrics.successfulActions.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Failed</div>
                  <div className="stat-value red">{metricsData.metrics.failedActions.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Safety Blocks</div>
                  <div className="stat-value gold">{metricsData.metrics.deniedActions.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Uptime</div>
                  <div className="stat-value blue">{(() => {
                    const ms = metricsData.metrics.uptimeMs;
                    if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
                    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
                    if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
                    return `${(ms / 86_400_000).toFixed(1)}d`;
                  })()}</div>
                </div>
              </div>
              {metricsData.heartbeat && (
                <div className="settings-row" style={{ marginTop: 'var(--space-sm)' }}>
                  <span className="settings-label">Last heartbeat</span>
                  <span className="settings-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{new Date(metricsData.heartbeat).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Decision Activity Stream */}
          {decisions.length > 0 && (
            <div className="settings-section" style={{ marginTop: 'var(--space-lg)' }}>
              <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <Zap size={16} style={{ color: 'var(--color-primary)' }} />
                Live Activity Stream
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 'auto' }}>
                  Last {decisions.length} decisions
                </span>
              </div>
              <div className="decision-stream">
                {decisions.map((d, i) => (
                  <div key={`${d.timestamp}-${i}`} className={`decision-item ${d.result}`}>
                    <span className="decision-time">
                      {new Date(d.timestamp).toLocaleTimeString()}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <span className="decision-action">{d.action.replace(/_/g, ' ')}</span>
                        <span className={`decision-result ${d.result}`}>{d.result}</span>
                        {d.durationMs > 0 && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {d.durationMs}ms
                          </span>
                        )}
                      </div>
                      {d.details && Object.keys(d.details).length > 0 && (
                        <div className="decision-details">
                          {Object.entries(d.details).map(([k, v]) => (
                            <span key={k}>{k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)} </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
