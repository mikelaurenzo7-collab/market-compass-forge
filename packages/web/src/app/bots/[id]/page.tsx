'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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

interface MetricEntry {
  timestamp: string;
  equity: number;
  pnl: number;
  drawdown: number;
}

function StatusDot({ status }: { status: string }) {
  return <span className={`status-dot ${status}`} title={status} />;
}

export default function BotDetailPage() {
  const { user, loading, apiFetch } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params.id as string;
  const [bot, setBot] = useState<BotDetail | null>(null);
  const [runtimeMetrics, setRuntimeMetrics] = useState<any | null>(null);
  const [metricSnapshots, setMetricSnapshots] = useState<MetricEntry[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  const FAMILY_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
    trading: { icon: '📈', color: 'var(--color-trading)', label: 'Trading' },
    store: { icon: '🛒', color: 'var(--color-store)', label: 'Store' },
    social: { icon: '📱', color: 'var(--color-social)', label: 'Social' },
    workforce: { icon: '⚙️', color: 'var(--color-workforce)', label: 'Workforce' },
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
    // Fetch runtime metrics
    try {
      const res = await apiFetch(`/api/bots/${botId}/metrics`);
      const json = await res.json();
      if (json.success) {
        setRuntimeMetrics(json.data.metrics ?? null);
      }
    } catch { /* ignore */ }
    // Fetch history + snapshots
    try {
      const res2 = await apiFetch(`/api/bots/${botId}/history?limit=100`);
      const j2 = await res2.json();
      if (j2.success) {
        setDecisions(j2.data.decisions || []);
        setMetricSnapshots(j2.data.metricsSnapshots || []);
      }
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
        <Link href="/bots" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← Back to Bots
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
            <span className="family-banner-icon">{FAMILY_CONFIG[bot.family]?.icon}</span>
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
                  <button className="btn btn-secondary" onClick={() => handleAction('pause')}>Pause</button>
                  <button className="btn btn-danger" onClick={() => handleAction('stop')}>Stop</button>
                </>
              ) : bot.status === 'paused' ? (
                <>
                  <button className="btn btn-primary" onClick={() => handleAction('start')}>Resume</button>
                  <button className="btn btn-danger" onClick={() => handleAction('stop')}>Stop</button>
                </>
              ) : (
                <button className="btn btn-primary" onClick={() => handleAction('start')}>Start</button>
              )}
              {bot.status === 'running' && (
                <button className="btn btn-danger" onClick={() => handleAction('kill')} title="Emergency kill switch">Kill</button>
              )}
              {bot.status !== 'running' && (
                <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
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

          {/* Runtime metrics (current) */}
          {runtimeMetrics && (
            <div className="settings-section" style={{ marginTop: 'var(--space-lg)' }}>
              <div className="settings-section-title">Live Performance</div>
              <div className="stats-grid" style={{ marginBottom: 'var(--space-md)' }}>
                <div className="stat-card">
                  <div className="stat-label">Total P&amp;L</div>
                  <div className={`stat-value ${runtimeMetrics.totalPnlUsd >= 0 ? 'green' : 'red'}`}>
                    {runtimeMetrics.totalPnlUsd >= 0 ? '+' : ''}${runtimeMetrics.totalPnlUsd.toLocaleString()}
                  </div>
                </div>
                {runtimeMetrics.initialBalanceUsd > 0 && (
                  <div className="stat-card">
                    <div className="stat-label">ROI</div>
                    <div className="stat-value gold">
                      {(runtimeMetrics.totalPnlUsd / runtimeMetrics.initialBalanceUsd * 100).toFixed(2)}%
                    </div>
                  </div>
                )}
              {/* custom metrics */}
              {runtimeMetrics.custom && Object.keys(runtimeMetrics.custom).length > 0 && (
                <div className="stat-card" style={{ gridColumn: 'span 2' }}>
                  <div className="stat-label">Other metrics</div>
                  <div className="stat-value" style={{ fontSize: '0.75rem', textAlign: 'left' }}>
                    {Object.entries(runtimeMetrics.custom).map(([k,v]) => `${k}: ${String(v)}`).join(', ')}
                  </div>
                </div>
              )}
                <div className="stat-card">
                  <div className="stat-label">Ticks</div>
                  <div className="stat-value blue">{runtimeMetrics.totalTicks}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Successes</div>
                  <div className="stat-value green">{runtimeMetrics.successfulActions}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Failures</div>
                  <div className="stat-value red">{runtimeMetrics.failedActions}</div>
                </div>
                {bot.family === 'trading' && runtimeMetrics.totalTrades > 0 && (
                  <>
                    <div className="stat-card">
                      <div className="stat-label">Trades</div>
                      <div className="stat-value purple">{runtimeMetrics.totalTrades}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Win Rate</div>
                      <div className="stat-value green">{(runtimeMetrics.winRate * 100).toFixed(1)}%</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Consec. Losses</div>
                      <div className="stat-value red">{runtimeMetrics.consecutiveLosses}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Historical snapshots */}
          {metricSnapshots.length > 0 && (
            <div className="settings-section" style={{ marginTop: 'var(--space-lg)' }}>
              <div className="settings-section-title">Metric History</div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Recorded At</th>
                      <th>Ticks</th>
                      <th>P&amp;L</th>
                      <th>Uptime (ms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricSnapshots.map((m, i) => (
                      <tr key={i} style={{ fontSize: '0.85rem' }}>
                        <td>{new Date(m.recordedAt).toLocaleString()}</td>
                        <td>{m.totalTicks}</td>
                        <td>{m.totalPnlUsd >= 0 ? '+' : ''}${m.totalPnlUsd}</td>
                        <td>{m.uptimeMs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {decisions.length > 0 && (
            <div className="settings-section" style={{ marginTop: 'var(--space-lg)' }}>
              <div className="settings-section-title">Decision History</div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Result</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decisions.map((h, i) => (
                      <tr key={i} style={{ fontSize: '0.85rem' }}>
                        <td>{new Date(h.timestamp).toLocaleString()}</td>
                        <td>{h.action}</td>
                        <td>{h.result}</td>
                        <td><pre style={{ whiteSpace: 'pre-wrap', maxWidth: 400 }}>{JSON.stringify(h.details)}</pre></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
