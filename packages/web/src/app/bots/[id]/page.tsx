'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  TrendingUp, ShoppingCart, Share2, Users, Play, Pause, Square,
  Trash2, AlertOctagon, ArrowLeft, Activity, Zap, Pencil, Shield,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import AppShell from '../../components/AppShell';
import LoadingScreen from '../../components/LoadingScreen';
import { PlatformLogo, StrategyPill, getPlatformBrand, getFamilyConfig } from '../../components/PlatformIdentity';

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

interface OperatorPlaybookItem {
  title: string;
  action: string;
  reason: string;
  impact: string;
  tone: 'positive' | 'neutral' | 'warning';
}

const FAMILY_ICONS: Record<string, React.ReactNode> = {
  trading: <TrendingUp size={28} />,
  store: <ShoppingCart size={28} />,
  social: <Share2 size={28} />,
  workforce: <Users size={28} />,
};

function StatusDot({ status }: { status: string }) {
  return <span className={`status-dot ${status}`} title={status} aria-label={`Bot status: ${status}`} role="status" />;
}

/* ─── Family-specific metric explanations ─── */
function FamilyMetricContext({ family, metrics }: { family: string; metrics: BotMetrics }) {
  const successRate = metrics.totalTicks > 0
    ? Math.round((metrics.successfulActions / Math.max(metrics.successfulActions + metrics.failedActions, 1)) * 100)
    : 0;

  if (family === 'trading') {
    return (
      <div className="metric-context-grid">
        <div className="metric-context-card trading">
          <div className="metric-context-label">Net P&L</div>
          <div className={`metric-context-value ${metrics.totalPnlUsd >= 0 ? 'positive' : 'negative'}`}>
            {metrics.totalPnlUsd >= 0 ? '+' : ''}${metrics.totalPnlUsd.toLocaleString()}
          </div>
          <div className="metric-context-hint">Realized profit & loss</div>
        </div>
        <div className="metric-context-card">
          <div className="metric-context-label">Win Rate</div>
          <div className="metric-context-value">{successRate}%</div>
          <div className="metric-context-hint">{metrics.successfulActions} wins / {metrics.failedActions} losses</div>
        </div>
        <div className="metric-context-card">
          <div className="metric-context-label">Trades</div>
          <div className="metric-context-value">{metrics.totalTicks.toLocaleString()}</div>
          <div className="metric-context-hint">Total executions</div>
        </div>
        <div className="metric-context-card">
          <div className="metric-context-label">Safety Blocks</div>
          <div className="metric-context-value caution">{metrics.deniedActions}</div>
          <div className="metric-context-hint">Risk controls triggered</div>
        </div>
      </div>
    );
  }

  if (family === 'store') {
    return (
      <div className="metric-context-grid">
        <div className="metric-context-card store">
          <div className="metric-context-label">Actions</div>
          <div className="metric-context-value">{(metrics.successfulActions + metrics.failedActions).toLocaleString()}</div>
          <div className="metric-context-hint">Pricing, inventory & listing ops</div>
        </div>
        <div className="metric-context-card">
          <div className="metric-context-label">Success Rate</div>
          <div className="metric-context-value">{successRate}%</div>
          <div className="metric-context-hint">{metrics.successfulActions} successful</div>
        </div>
        <div className="metric-context-card">
          <div className="metric-context-label">Ticks</div>
          <div className="metric-context-value">{metrics.totalTicks.toLocaleString()}</div>
          <div className="metric-context-hint">Monitoring cycles</div>
        </div>
        <div className="metric-context-card">
          <div className="metric-context-label">Safety Blocks</div>
          <div className="metric-context-value caution">{metrics.deniedActions}</div>
          <div className="metric-context-hint">Price guard activations</div>
        </div>
      </div>
    );
  }

  if (family === 'social') {
    return (
      <div className="metric-context-grid">
        <div className="metric-context-card social">
          <div className="metric-context-label">Engagements</div>
          <div className="metric-context-value">{metrics.successfulActions.toLocaleString()}</div>
          <div className="metric-context-hint">Posts, likes, replies</div>
        </div>
        <div className="metric-context-card">
          <div className="metric-context-label">Success Rate</div>
          <div className="metric-context-value">{successRate}%</div>
          <div className="metric-context-hint">Delivery success</div>
        </div>
        <div className="metric-context-card">
          <div className="metric-context-label">Cycles</div>
          <div className="metric-context-value">{metrics.totalTicks.toLocaleString()}</div>
          <div className="metric-context-hint">Content & engagement cycles</div>
        </div>
        <div className="metric-context-card">
          <div className="metric-context-label">Blocked</div>
          <div className="metric-context-value caution">{metrics.deniedActions}</div>
          <div className="metric-context-hint">Content flagged by safety</div>
        </div>
      </div>
    );
  }

  // workforce / default
  return (
    <div className="metric-context-grid">
      <div className="metric-context-card workforce">
        <div className="metric-context-label">Tasks Completed</div>
        <div className="metric-context-value">{metrics.successfulActions.toLocaleString()}</div>
        <div className="metric-context-hint">Automated task completions</div>
      </div>
      <div className="metric-context-card">
        <div className="metric-context-label">Efficiency</div>
        <div className="metric-context-value">{successRate}%</div>
        <div className="metric-context-hint">Task success rate</div>
      </div>
      <div className="metric-context-card">
        <div className="metric-context-label">Cycles</div>
        <div className="metric-context-value">{metrics.totalTicks.toLocaleString()}</div>
        <div className="metric-context-hint">Automation cycles</div>
      </div>
      <div className="metric-context-card">
        <div className="metric-context-label">Escalations</div>
        <div className="metric-context-value caution">{metrics.deniedActions}</div>
        <div className="metric-context-hint">Required human review</div>
      </div>
    </div>
  );
}

function buildOperatorPlaybook(bot: BotDetail, metrics: BotMetrics | null, decisions: DecisionEntry[]): OperatorPlaybookItem[] {
  const config = bot.config as Record<string, unknown>;
  const totalActions = metrics ? metrics.successfulActions + metrics.failedActions + metrics.deniedActions : 0;
  const successRate = metrics && totalActions > 0
    ? Math.round((metrics.successfulActions / totalActions) * 100)
    : 0;
  const recentFailures = decisions.filter((entry) => entry.result === 'error' || entry.result === 'failed').length;
  const recentBlocks = decisions.filter((entry) => entry.result === 'denied' || entry.result === 'blocked').length;
  const playbook: OperatorPlaybookItem[] = [];

  if (bot.family === 'trading') {
    if (Boolean(config.paperTrading)) {
      playbook.push({
        title: 'Graduate your best symbol',
        action: 'Keep paper mode on for wide exploration, then move one proven symbol into live execution with the current risk caps.',
        reason: 'Launch customers need a controlled path from simulation to measurable live performance.',
        impact: 'Higher trust with real P&L proof and contained downside.',
        tone: 'positive',
      });
    }
    if (!Boolean(config.multiTimeframeConfirmation)) {
      playbook.push({
        title: 'Raise signal quality',
        action: 'Enable multi-timeframe confirmation before expanding size or adding symbols.',
        reason: 'This bot is still relying on single-frame entries, which is weaker during volatile launch conditions.',
        impact: 'Fewer low-conviction trades and better execution quality.',
        tone: 'neutral',
      });
    }
    if (metrics && (successRate < 60 || recentFailures > 0)) {
      playbook.push({
        title: 'Tighten trading risk',
        action: 'Reduce position size or widen cooldowns until the recent error and loss pattern stabilizes.',
        reason: `${successRate}% execution quality with ${recentFailures} recent failed decisions is below launch-grade consistency.`,
        impact: 'Lower drawdown risk while preserving decision throughput.',
        tone: 'warning',
      });
    }
  } else if (bot.family === 'store') {
    if (!Boolean(config.autoApplyPricing)) {
      playbook.push({
        title: 'Automate winning price moves',
        action: 'Turn on auto-apply pricing once your floor and ceiling rules are validated.',
        reason: 'Manual approval slows down the exact pricing windows that create measurable store ROI.',
        impact: 'Faster margin capture on demand and inventory swings.',
        tone: 'positive',
      });
    }
    if (!Boolean(config.autoReorder)) {
      playbook.push({
        title: 'Protect against stockouts',
        action: 'Enable auto-reorder or add a human-in-the-loop reorder workflow before launch.',
        reason: 'Inventory forecasting is more valuable when it closes the loop instead of only flagging risk.',
        impact: 'Better in-stock rate and less revenue leakage.',
        tone: 'neutral',
      });
    }
    if (metrics && (recentBlocks > 0 || Number(config.syncIntervalMs ?? 0) > 3_600_000)) {
      playbook.push({
        title: 'Shorten your commerce feedback loop',
        action: 'Lower sync cadence and review min-margin rules on the products getting blocked most often.',
        reason: `${recentBlocks} recent guardrail blocks suggest the bot is seeing opportunities it cannot safely execute.`,
        impact: 'More usable catalog actions with fewer missed pricing windows.',
        tone: recentBlocks > 0 ? 'warning' : 'neutral',
      });
    }
  } else if (bot.family === 'social') {
    if (Boolean(config.paperMode)) {
      playbook.push({
        title: 'Move from draft mode to publishing proof',
        action: 'Launch one platform live with your safest content lane while keeping other channels in paper mode.',
        reason: 'You need public proof of reach and consistency before the broader social operator story lands.',
        impact: 'Live audience data without opening every risk surface at once.',
        tone: 'positive',
      });
    }
    if (Number(config.maxPostsPerDay ?? 0) < 3) {
      playbook.push({
        title: 'Increase content volume carefully',
        action: 'Raise daily posting limits for the best-performing platform and pair it with hashtag or trend strategies.',
        reason: 'Low publishing cadence can cap growth even when execution quality is strong.',
        impact: 'More reach opportunities and more signal for content optimization.',
        tone: 'neutral',
      });
    }
    if (metrics && (successRate < 70 || recentBlocks > 0)) {
      playbook.push({
        title: 'Refine safety and brand guardrails',
        action: 'Expand sensitive topic keywords and tighten brand voice guidance before scaling output.',
        reason: `${recentBlocks} recent blocks or ${successRate}% delivery quality indicates the bot is still brushing against content boundaries.`,
        impact: 'Cleaner publishing flow and fewer preventable content rejections.',
        tone: 'warning',
      });
    }
  } else {
    if (Boolean(config.paperMode)) {
      playbook.push({
        title: 'Prove one live workflow',
        action: 'Pick a single repetitive workflow and run it live with approvals still enabled for external actions.',
        reason: 'Launch users need visible hours-saved proof, not just simulated automation.',
        impact: 'Faster path to an ROI case study without widening operational risk.',
        tone: 'positive',
      });
    }
    if (!config.workingHoursUtc) {
      playbook.push({
        title: 'Define operating hours',
        action: 'Set explicit working hours so automation runs when downstream teams can respond.',
        reason: 'Unchecked 24/7 task execution creates handoff gaps in support, ops, and finance workflows.',
        impact: 'Better SLA adherence and cleaner human escalation paths.',
        tone: 'neutral',
      });
    }
    if (metrics && (successRate < 75 || recentFailures > 0)) {
      playbook.push({
        title: 'Raise confidence thresholds',
        action: 'Increase escalation confidence or reduce concurrent task load until completion quality improves.',
        reason: `${successRate}% completion quality with ${recentFailures} recent failures is not strong enough for a broad production rollout.`,
        impact: 'Higher task reliability and fewer manual cleanup cycles.',
        tone: 'warning',
      });
    }
  }

  if (playbook.length < 3 && metrics && totalActions === 0) {
    playbook.push({
      title: 'Generate live operating data',
      action: bot.status === 'running' ? 'Keep this operator active long enough to gather at least a few execution cycles.' : 'Start or resume this operator and let it run through a first live cycle.',
      reason: 'The product can only prove ROI after it has real execution history to analyze.',
      impact: 'Better optimization guidance and stronger launch proof.',
      tone: 'neutral',
    });
  }

  return playbook.slice(0, 3);
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

  const DETAIL_FAMILY_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
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
    } catch (err) {
      console.error('Failed to load bot detail:', err);
      setError('Failed to load bot');
    } finally {
      setFetching(false);
    }
    // Fetch metrics
    try {
      const res = await apiFetch(`/api/bots/${botId}/metrics`);
      const json = await res.json();
      if (json.success) setMetricsData(json.data ?? null);
    } catch (err) {
      console.error('Failed to load bot metrics:', err);
    }
    // Fetch decisions
    try {
      const res = await apiFetch(`/api/bots/${botId}/decisions`);
      const json = await res.json();
      if (json.success) setDecisions(json.data ?? []);
    } catch (err) {
      console.error('Failed to load bot decisions:', err);
    }
  }, [apiFetch, botId]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    fetchBot();

    let interval: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => { if (!interval) interval = setInterval(fetchBot, 5_000); };
    const stopPolling = () => { if (interval) { clearInterval(interval); interval = null; } };
    startPolling();
    const onVisibility = () => { if (document.hidden) stopPolling(); else { fetchBot(); startPolling(); } };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stopPolling(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [user, loading, router, fetchBot]);

  async function handleAction(action: string) {
    setError('');
    try {
      await apiFetch(`/api/bots/${botId}/${action}`, { method: 'POST' });
      fetchBot();
    } catch (err) {
      console.error(`Failed to ${action} bot:`, err);
      setError(`Failed to ${action} bot`);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this bot? This cannot be undone.')) return;
    setError('');
    try {
      await apiFetch(`/api/bots/${botId}`, { method: 'DELETE' });
      router.push('/bots');
    } catch (err) {
      console.error('Failed to delete bot:', err);
      setError('Failed to delete bot');
    }
  }

  if (loading || !user) return <LoadingScreen />;

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

      {bot && (() => {
        const brand = getPlatformBrand(bot.platform);
        const famCfg = DETAIL_FAMILY_CONFIG[bot.family];
        const playbook = buildOperatorPlaybook(bot, metricsData?.metrics ?? null, decisions);
        return (
        <>
          {/* Platform-branded hero banner */}
          <div className={`bot-detail-hero ${bot.family}`} style={{ '--platform-color': brand.color } as React.CSSProperties}>
            <div className="bot-detail-hero-bg" style={{ background: `linear-gradient(135deg, ${brand.dimColor}, var(--bg-card))` }} />
            <div className="bot-detail-hero-content">
              <PlatformLogo platform={bot.platform} size={52} />
              <div className="bot-detail-hero-info">
                <div className="bot-detail-hero-name">
                  {bot.name}
                  <StatusDot status={bot.status} />
                </div>
                <div className="bot-detail-hero-meta">
                  <span style={{ color: brand.color, fontWeight: 700 }}>{brand.name}</span>
                  <span className="bot-detail-hero-sep">·</span>
                  <span>{famCfg?.label ?? bot.family} Operator</span>
                  {Boolean(bot.config?.paperTrading || bot.config?.paperMode) && (
                    <>
                      <span className="bot-detail-hero-sep">·</span>
                      <span className="bot-detail-hero-paper"><Shield size={11} /> Paper Mode</span>
                    </>
                  )}
                </div>
                <div className="bot-detail-hero-tagline">{brand.tagline}</div>
              </div>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="bot-detail-actions-bar">
            <div className="bot-detail-status-label">
              <span className={`status-dot ${bot.status}`} />
              <span style={{ color: bot.status === 'running' ? 'var(--green)' : bot.status === 'paused' ? 'var(--gold)' : 'var(--text-secondary)' }}>
                {bot.status === 'running' ? 'Running' : bot.status === 'paused' ? 'Paused' : bot.status.charAt(0).toUpperCase() + bot.status.slice(1)}
              </span>
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
                  <button className="btn btn-danger" onClick={() => handleAction('kill')} title="Emergency kill switch" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <AlertOctagon size={14} /> Kill
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
              {bot.status !== 'running' && (
                <>
                  <button className="btn btn-danger" onClick={handleDelete} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Trash2 size={14} /> Delete
                  </button>
                  <Link href={`/bots/${bot.id}/edit`} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                    <Pencil size={14} /> Edit
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Family-specific metrics */}
          {metricsData && (
            <FamilyMetricContext family={bot.family} metrics={metricsData.metrics} />
          )}

          {playbook.length > 0 && (
            <div className="settings-section" style={{ marginTop: 'var(--space-lg)' }}>
              <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <Zap size={16} style={{ color: famCfg?.color }} />
                Operator Playbook
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 'auto' }}>
                  tuned for {famCfg?.label?.toLowerCase() ?? bot.family} outcomes
                </span>
              </div>
              <div className="operator-playbook-grid">
                {playbook.map((item) => (
                  <div key={item.title} className={`operator-playbook-card ${item.tone}`}>
                    <div className="operator-playbook-title-row">
                      <div className="operator-playbook-title">{item.title}</div>
                      <div className={`operator-playbook-impact ${item.tone}`}>{item.impact}</div>
                    </div>
                    <div className="operator-playbook-action">{item.action}</div>
                    <div className="operator-playbook-reason">{item.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strategies & Config panels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-lg)', marginTop: 'var(--space-lg)' }}>
            {/* Strategies */}
            <div className="settings-section">
              <div className="settings-section-title">Active Strategies</div>
              {(() => {
                const strategies = bot.config?.strategies
                  ? (bot.config.strategies as string[])
                  : bot.config?.strategy
                    ? [bot.config.strategy as string]
                    : [];
                return strategies.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No strategies configured</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                    {strategies.map((s) => (
                      <StrategyPill key={s} strategy={s} />
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Details */}
            <div className="settings-section">
              <div className="settings-section-title">Bot Details</div>
              <div className="settings-row">
                <span className="settings-label">Platform</span>
                <span className="settings-value" style={{ color: brand.color, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{brand.name}</span>
              </div>
              <div className="settings-row">
                <span className="settings-label">Family</span>
                <span className="settings-value" style={{ color: famCfg?.color }}>{famCfg?.label}</span>
              </div>
              <div className="settings-row">
                <span className="settings-label">Created</span>
                <span className="settings-value">{new Date(bot.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="settings-row">
                <span className="settings-label">ID</span>
                <span className="settings-value">{bot.id}</span>
              </div>
            </div>
          </div>

          {/* Config */}
          {bot.config && Object.keys(bot.config).filter(k => k !== 'strategies' && k !== 'strategy').length > 0 && (
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

          {/* Heartbeat */}
          {metricsData?.heartbeat && (
            <div className="settings-section" style={{ marginTop: 'var(--space-lg)' }}>
              <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <Activity size={14} style={{ color: 'var(--green)' }} />
                Heartbeat
              </div>
              <div className="settings-row">
                <span className="settings-label">Last seen</span>
                <span className="settings-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{new Date(metricsData.heartbeat).toLocaleString()}</span>
              </div>
              <div className="settings-row">
                <span className="settings-label">Uptime</span>
                <span className="settings-value">{(() => {
                  const ms = metricsData.metrics.uptimeMs;
                  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
                  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
                  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
                  return `${(ms / 86_400_000).toFixed(1)}d`;
                })()}</span>
              </div>
            </div>
          )}

          {/* Decision Activity Stream */}
          {decisions.length > 0 && (
            <div className="settings-section" style={{ marginTop: 'var(--space-lg)' }}>
              <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <Zap size={16} style={{ color: brand.color }} />
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
      );
      })()}
    </AppShell>
  );
}
