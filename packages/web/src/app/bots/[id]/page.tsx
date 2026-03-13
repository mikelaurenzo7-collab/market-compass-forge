'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  TrendingUp, ShoppingCart, Share2, Users, Play, Pause, Square,
  Trash2, AlertOctagon, ArrowLeft, Activity, Zap, Pencil, Shield, CheckCircle2, Clock3, XCircle,
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
  authority?: {
    mode: 'worker-control-plane' | 'local-runtime';
    label: string;
    live: boolean;
  };
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

interface SafetyApprovalEntry {
  id: string;
  botId: string;
  action: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  policyId: string;
  status: 'pending' | 'approved' | 'rejected' | 'consumed';
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

interface StoreOutcomeSummary {
  revenueUsd: number;
  ordersCount: number;
  fulfilledOrdersCount: number;
  unitsSold: number;
  stockoutAlerts: number;
  restocks: number;
}

interface StoreOutcomeEvent {
  eventType: string;
  revenueUsd: number;
  units: number;
  payload: string;
  createdAt: number;
}

interface StoreOutcomeData {
  period: string;
  platform: string;
  summary: StoreOutcomeSummary;
  timeseries: Array<{ ts: number; revenueUsd: number; ordersCount: number; fulfilledOrdersCount: number; stockoutAlerts: number; unitsSold: number }>;
  recentEvents: StoreOutcomeEvent[];
}

interface OperatorPlaybookItem {
  title: string;
  action: string;
  reason: string;
  impact: string;
  tone: 'positive' | 'neutral' | 'warning';
  cta?: string;
  configPatch?: Record<string, unknown>;
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

function summarizeDecision(decision: DecisionEntry): string | null {
  const details = decision.details ?? {};
  if (typeof details.reason === 'string' && details.reason.trim().length > 0) return details.reason;
  if (details.approvalConsumed === true && typeof details.approvalId === 'string') {
    return `Approval grant ${details.approvalId} was consumed and execution resumed.`;
  }
  if (typeof details.approvalId === 'string' && typeof details.policyId === 'string') {
    return `Queued behind approval ${details.approvalId} because policy ${details.policyId} intervened.`;
  }
  if (typeof details.policyId === 'string' && (decision.result === 'denied' || decision.result === 'blocked')) {
    return `Blocked by policy ${details.policyId}.`;
  }
  if (typeof details.suggestedSignal === 'string') {
    return `Suggested signal: ${details.suggestedSignal}.`;
  }
  return null;
}

function formatDecisionResult(result: string): string {
  return result.replace(/_/g, ' ');
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
        cta: 'Enable confirmation',
        configPatch: { multiTimeframeConfirmation: true },
      });
    }
    if (metrics && (successRate < 60 || recentFailures > 0)) {
      playbook.push({
        title: 'Tighten trading risk',
        action: 'Reduce position size or widen cooldowns until the recent error and loss pattern stabilizes.',
        reason: `${successRate}% execution quality with ${recentFailures} recent failed decisions is below launch-grade consistency.`,
        impact: 'Lower drawdown risk while preserving decision throughput.',
        tone: 'warning',
        cta: 'Reduce risk',
        configPatch: {
          maxPositionSizeUsd: Math.max(25, Math.round(Number(config.maxPositionSizeUsd ?? 100) * 0.8)),
          cooldownAfterLossMs: Math.max(300_000, Number(config.cooldownAfterLossMs ?? 60_000)),
        },
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
        cta: 'Enable auto pricing',
        configPatch: { autoApplyPricing: true },
      });
    }
    if (!Boolean(config.autoReorder)) {
      playbook.push({
        title: 'Protect against stockouts',
        action: 'Enable auto-reorder or add a human-in-the-loop reorder workflow before launch.',
        reason: 'Inventory forecasting is more valuable when it closes the loop instead of only flagging risk.',
        impact: 'Better in-stock rate and less revenue leakage.',
        tone: 'neutral',
        cta: 'Enable auto reorder',
        configPatch: { autoReorder: true },
      });
    }
    if (metrics && (recentBlocks > 0 || Number(config.syncIntervalMs ?? 0) > 3_600_000)) {
      playbook.push({
        title: 'Shorten your commerce feedback loop',
        action: 'Lower sync cadence and review min-margin rules on the products getting blocked most often.',
        reason: `${recentBlocks} recent guardrail blocks suggest the bot is seeing opportunities it cannot safely execute.`,
        impact: 'More usable catalog actions with fewer missed pricing windows.',
        tone: recentBlocks > 0 ? 'warning' : 'neutral',
        cta: 'Speed up sync',
        configPatch: { syncIntervalMs: Math.max(60_000, Math.round(Number(config.syncIntervalMs ?? 300_000) * 0.5)) },
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
        cta: 'Increase cadence',
        configPatch: { maxPostsPerDay: Math.max(3, Number(config.maxPostsPerDay ?? 2)) },
      });
    }
    if (metrics && (successRate < 70 || recentBlocks > 0)) {
      playbook.push({
        title: 'Refine safety and brand guardrails',
        action: 'Expand sensitive topic keywords and tighten brand voice guidance before scaling output.',
        reason: `${recentBlocks} recent blocks or ${successRate}% delivery quality indicates the bot is still brushing against content boundaries.`,
        impact: 'Cleaner publishing flow and fewer preventable content rejections.',
        tone: 'warning',
        cta: 'Require approval',
        configPatch: { contentApprovalRequired: true },
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
        cta: 'Set workday window',
        configPatch: { workingHoursUtc: { start: 13, end: 21 } },
      });
    }
    if (metrics && (successRate < 75 || recentFailures > 0)) {
      playbook.push({
        title: 'Raise confidence thresholds',
        action: 'Increase escalation confidence or reduce concurrent task load until completion quality improves.',
        reason: `${successRate}% completion quality with ${recentFailures} recent failures is not strong enough for a broad production rollout.`,
        impact: 'Higher task reliability and fewer manual cleanup cycles.',
        tone: 'warning',
        cta: 'Tighten escalation',
        configPatch: {
          escalationThresholdConfidence: Math.max(0.8, Number(config.escalationThresholdConfidence ?? 0.75)),
          maxConcurrentTasks: Math.max(1, Math.min(Number(config.maxConcurrentTasks ?? 3), 2)),
        },
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
<<<<<<< HEAD
  const [runtimeMetrics, setRuntimeMetrics] = useState<any | null>(null);
  const [metricSnapshots, setMetricSnapshots] = useState<MetricEntry[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
=======
  const [metricsData, setMetricsData] = useState<MetricsResponse | null>(null);
  const [decisions, setDecisions] = useState<DecisionEntry[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<SafetyApprovalEntry[]>([]);
>>>>>>> f42fb9ea410432b2e524632c6241d5d491145662
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [optimizationState, setOptimizationState] = useState<{ title: string; saving: boolean } | null>(null);
  const [optimizationMessage, setOptimizationMessage] = useState('');
  const [storeOutcomes, setStoreOutcomes] = useState<StoreOutcomeData | null>(null);

  const DETAIL_FAMILY_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    trading: { icon: <TrendingUp size={18} />, color: 'var(--color-trading)', label: 'Trading' },
    store: { icon: <ShoppingCart size={18} />, color: 'var(--color-store)', label: 'Store' },
    social: { icon: <Share2 size={18} />, color: 'var(--color-social)', label: 'Social' },
    workforce: { icon: <Users size={18} />, color: 'var(--color-workforce)', label: 'Workforce' },
  };


  const fetchBot = useCallback(async () => {
    let loadedBot: BotDetail | null = null;
    try {
      const res = await apiFetch(`/api/bots/${botId}`);
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      loadedBot = json.data ?? json;
      setBot(loadedBot);
    } catch (err) {
      console.error('Failed to load bot detail:', err);
      setError('Failed to load bot');
    } finally {
      setFetching(false);
    }
    // Fetch runtime metrics
    try {
      const res = await apiFetch(`/api/bots/${botId}/metrics`);
      const json = await res.json();
<<<<<<< HEAD
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
=======
      if (json.success) setMetricsData(json.data ?? null);
    } catch (err) {
      console.error('Failed to load bot metrics:', err);
    }
    // Fetch decisions
    try {
      const res = await apiFetch(`/api/bots/${botId}/decisions`);
      const json = await res.json();
      if (json.success) setDecisions(json.data?.decisions ?? json.data ?? []);
    } catch (err) {
      console.error('Failed to load bot decisions:', err);
    }
    try {
      const res = await apiFetch(`/api/safety/approvals?botId=${botId}&includeResolved=true&limit=12`);
      const json = await res.json();
      if (json.success) setApprovalHistory(json.data ?? []);
    } catch (err) {
      console.error('Failed to load approval history:', err);
    }
    try {
      if (loadedBot?.family === 'store' && loadedBot?.platform) {
        const outcomesRes = await apiFetch(`/api/analytics/store-outcomes?period=30d&platform=${loadedBot.platform}`);
        const outcomesJson = await outcomesRes.json();
        if (outcomesJson.success) setStoreOutcomes(outcomesJson.data ?? null);
      } else {
        setStoreOutcomes(null);
      }
    } catch (err) {
      console.error('Failed to load store outcomes:', err);
    }
>>>>>>> f42fb9ea410432b2e524632c6241d5d491145662
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

  async function handleApplyOptimization(item: OperatorPlaybookItem) {
    if (!item.configPatch || !bot) return;

    setError('');
    setOptimizationMessage('');
    setOptimizationState({ title: item.title, saving: true });

    try {
      const res = await apiFetch(`/api/bots/${botId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: item.configPatch }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(typeof json.error === 'string' ? json.error : 'Failed to apply optimization');
      } else {
        setOptimizationMessage(`${item.title} applied`);
        await fetchBot();
      }
    } catch (err) {
      console.error('Failed to apply optimization:', err);
      setError('Failed to apply optimization');
    } finally {
      setOptimizationState(null);
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
      {optimizationMessage && <div className="auth-success">{optimizationMessage}</div>}

      {bot && (() => {
        const brand = getPlatformBrand(bot.platform);
        const famCfg = DETAIL_FAMILY_CONFIG[bot.family];
        const playbook = buildOperatorPlaybook(bot, metricsData?.metrics ?? null, decisions);
        const approvalStatusMeta: Record<SafetyApprovalEntry['status'], { icon: React.ReactNode; label: string; className: string }> = {
          pending: { icon: <Clock3 size={14} />, label: 'Pending approval', className: 'pending' },
          approved: { icon: <CheckCircle2 size={14} />, label: 'Approved', className: 'approved' },
          rejected: { icon: <XCircle size={14} />, label: 'Rejected', className: 'rejected' },
          consumed: { icon: <Shield size={14} />, label: 'Approval consumed', className: 'consumed' },
        };
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

          {bot.family === 'store' && storeOutcomes && ((storeOutcomes.summary.ordersCount > 0) || (storeOutcomes.summary.stockoutAlerts > 0)) && (
            <div className="settings-section" style={{ marginTop: 'var(--space-lg)' }}>
              <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <ShoppingCart size={16} style={{ color: famCfg?.color }} />
                Connected Store Outcomes
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 'auto' }}>
                  last 30 days on {brand.name}
                </span>
              </div>
              <div className="store-outcome-summary-grid">
                <div className="store-outcome-summary-card revenue">
                  <div className="store-outcome-summary-label">Revenue Captured</div>
                  <div className="store-outcome-summary-value">${storeOutcomes.summary.revenueUsd.toLocaleString()}</div>
                  <div className="store-outcome-summary-hint">Explicit order revenue from webhook events</div>
                </div>
                <div className="store-outcome-summary-card orders">
                  <div className="store-outcome-summary-label">Orders Captured</div>
                  <div className="store-outcome-summary-value">{storeOutcomes.summary.ordersCount.toLocaleString()}</div>
                  <div className="store-outcome-summary-hint">{storeOutcomes.summary.fulfilledOrdersCount.toLocaleString()} fulfilled · {storeOutcomes.summary.unitsSold.toLocaleString()} units</div>
                </div>
                <div className="store-outcome-summary-card alerts">
                  <div className="store-outcome-summary-label">Inventory Alerts</div>
                  <div className="store-outcome-summary-value">{storeOutcomes.summary.stockoutAlerts.toLocaleString()}</div>
                  <div className="store-outcome-summary-hint">{storeOutcomes.summary.restocks.toLocaleString()} restocks recorded</div>
                </div>
              </div>
              <div className="store-outcome-list" style={{ marginTop: 'var(--space-md)' }}>
                {storeOutcomes.recentEvents.slice(0, 6).map((event, index) => (
                  <div key={`${event.eventType}-${event.createdAt}-${index}`} className={`store-outcome-item ${event.eventType}`}>
                    <div className="store-outcome-item-header">
                      <div className="store-outcome-item-title">{event.eventType.replace(/_/g, ' ')}</div>
                      <div className="store-outcome-item-time">{new Date(event.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="store-outcome-item-meta">
                      {event.revenueUsd > 0 && <span>Revenue: ${event.revenueUsd.toLocaleString()}</span>}
                      {event.units > 0 && <span>Units: {event.units.toLocaleString()}</span>}
                      {event.revenueUsd === 0 && event.units === 0 && <span>Inventory or fulfillment state change captured</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
                    {item.configPatch && item.cta && (
                      <button
                        type="button"
                        className="operator-playbook-button"
                        onClick={() => handleApplyOptimization(item)}
                        disabled={optimizationState?.saving === true}
                      >
                        {optimizationState?.saving && optimizationState.title === item.title ? 'Applying...' : item.cta}
                      </button>
                    )}
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

<<<<<<< HEAD
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
=======
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
>>>>>>> f42fb9ea410432b2e524632c6241d5d491145662
              </div>
            </div>
          )}

<<<<<<< HEAD
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
=======
          {metricsData?.authority && (
            <div className="settings-section" style={{ marginTop: 'var(--space-lg)' }}>
              <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <Shield size={14} style={{ color: brand.color }} />
                Execution Authority
              </div>
              <div className="settings-row">
                <span className="settings-label">Runtime source</span>
                <span className="settings-value">{metricsData.authority.label}</span>
              </div>
              <div className="settings-row">
                <span className="settings-label">Authority mode</span>
                <span className="settings-value">{metricsData.authority.mode === 'worker-control-plane' ? 'Distributed control plane' : 'Single-process dev runtime'}</span>
              </div>
              <div className="settings-row">
                <span className="settings-label">Live state</span>
                <span className="settings-value">{metricsData.authority.live ? 'Connected to active runtime' : 'Showing persisted state'}</span>
              </div>
            </div>
          )}

          {approvalHistory.length > 0 && (
            <div className="settings-section" style={{ marginTop: 'var(--space-lg)' }}>
              <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <Shield size={16} style={{ color: brand.color }} />
                Safety Approval Timeline
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 'auto' }}>
                  Last {approvalHistory.length} approval events
                </span>
              </div>
              <div className="approval-timeline">
                {approvalHistory.map((approval) => {
                  const meta = approvalStatusMeta[approval.status];
                  return (
                    <div key={approval.id} className={`approval-item ${meta.className}`}>
                      <div className={`approval-badge ${meta.className}`}>
                        {meta.icon}
                        <span>{meta.label}</span>
                      </div>
                      <div className="approval-copy">
                        <div className="approval-heading-row">
                          <span className="approval-action">{approval.action.replace(/_/g, ' ')}</span>
                          <span className={`approval-risk ${approval.riskLevel}`}>{approval.riskLevel}</span>
                        </div>
                        <div className="approval-meta-row">
                          <span>Policy: {approval.policyId}</span>
                          <span>Opened: {new Date(approval.createdAt).toLocaleString()}</span>
                          {approval.resolvedAt && <span>Updated: {new Date(approval.resolvedAt).toLocaleString()}</span>}
                          {approval.resolvedBy && <span>By: {approval.resolvedBy}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                        <span className={`decision-result ${d.result}`}>{formatDecisionResult(d.result)}</span>
                        {d.durationMs > 0 && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {d.durationMs}ms
                          </span>
                        )}
                      </div>
                      {summarizeDecision(d) && (
                        <div className="decision-summary">{summarizeDecision(d)}</div>
                      )}
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
>>>>>>> f42fb9ea410432b2e524632c6241d5d491145662
              </div>
            </div>
          )}
        </>
      );
      })()}
    </AppShell>
  );
}
