'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  TrendingUp, ShoppingCart, Share2, Users, Plus, Play, Pause, Square,
  Trash2, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import AppShell from '../components/AppShell';

interface Bot {
  id: string;
  name: string;
  family: string;
  platform: string;
  status: string;
  strategies: string[];
  createdAt: string;
}

const FAMILY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; emptyDesc: string }> = {
  trading: {
    label: 'Trading Operators',
    icon: <TrendingUp size={18} />,
    color: 'var(--color-trading)',
    emptyDesc: 'Deploy a trading bot on Coinbase, Binance, Alpaca, Kalshi, or Polymarket.',
  },
  store: {
    label: 'Store Operators',
    icon: <ShoppingCart size={18} />,
    color: 'var(--color-store)',
    emptyDesc: 'Automate pricing, inventory, and listings on Shopify, Amazon, Etsy, and more.',
  },
  social: {
    label: 'Social Operators',
    icon: <Share2 size={18} />,
    color: 'var(--color-social)',
    emptyDesc: 'Schedule content, track engagement, and grow your audience on every platform.',
  },
  workforce: {
    label: 'Workforce Operators',
    icon: <Users size={18} />,
    color: 'var(--color-workforce)',
    emptyDesc: 'Automate team operations via Slack, Notion, Jira, Salesforce, and more.',
  },
};

function StatusDot({ status }: { status: string }) {
  return <span className={`status-dot ${status}`} title={status} />;
}

function BotCard({ bot, onAction, onDelete }: {
  bot: Bot;
  onAction: (id: string, action: string) => void;
  onDelete: (id: string) => void;
}) {
  const config = FAMILY_CONFIG[bot.family];
  return (
    <div className={`bot-card ${bot.family}`} style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="bot-card-header">
        <div>
          <Link href={`/bots/${bot.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="bot-name" style={{ marginBottom: 2 }}>{bot.name}</div>
          </Link>
          <div className="bot-platform">{bot.platform}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <StatusDot status={bot.status} />
          <span style={{
            fontSize: '0.65rem', fontWeight: 600,
            color: bot.status === 'running' ? 'var(--green)' : bot.status === 'paused' ? 'var(--gold)' : 'var(--text-muted)',
          }}>
            {bot.status}
          </span>
        </div>
      </div>
      {(bot.strategies ?? []).length > 0 && (
        <div className="bot-strategies">
          {(bot.strategies ?? []).map((s) => (
            <span key={s} className="strategy-tag">{s.replace(/_/g, ' ')}</span>
          ))}
        </div>
      )}
      <div style={{ marginTop: 'auto', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 4 }}>
        {bot.status === 'running' ? (
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => onAction(bot.id, 'pause')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Pause size={10} /> Pause
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => onAction(bot.id, 'stop')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Square size={10} /> Stop
            </button>
          </>
        ) : bot.status === 'paused' ? (
          <>
            <button className="btn btn-primary btn-sm" onClick={() => onAction(bot.id, 'start')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Play size={10} /> Resume
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => onAction(bot.id, 'stop')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Square size={10} /> Stop
            </button>
          </>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => onAction(bot.id, 'start')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Play size={10} /> Start
          </button>
        )}
        {bot.status !== 'running' && (
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(bot.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Trash2 size={10} /> Delete
          </button>
        )}
        <Link href={`/bots/${bot.id}`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Details <ChevronRight size={10} />
        </Link>
      </div>
    </div>
  );
}

export default function BotsPage() {
  return (
    <Suspense>
      <BotsPageContent />
    </Suspense>
  );
}

function BotsPageContent() {
  const { user, loading, apiFetch } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyFilter = searchParams.get('family');
  const [bots, setBots] = useState<Bot[]>([]);
  const [fetching, setFetching] = useState(true);

  const fetchBots = useCallback(async () => {
    try {
      const url = familyFilter ? `/api/bots?family=${familyFilter}` : '/api/bots';
      const res = await apiFetch(url);
      const json = await res.json();
      setBots(json.data ?? []);
    } catch {
      // API not running
    } finally {
      setFetching(false);
    }
  }, [apiFetch, familyFilter]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    fetchBots();
  }, [user, loading, router, fetchBots]);

  async function handleAction(botId: string, action: string) {
    await apiFetch(`/api/bots/${botId}/${action}`, { method: 'POST' });
    fetchBots();
  }

  async function handleDelete(botId: string) {
    if (!confirm('Delete this bot? This cannot be undone.')) return;
    await apiFetch(`/api/bots/${botId}`, { method: 'DELETE' });
    fetchBots();
  }

  if (loading || !user) return null;

  const currentConfig = familyFilter ? FAMILY_CONFIG[familyFilter] : null;
  const title = currentConfig ? currentConfig.label : 'All Bots';
  const runningCount = bots.filter((b) => b.status === 'running').length;

  return (
    <AppShell>
      <div className="page-header-row">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            {currentConfig && <span>{currentConfig.icon}</span>}
            {title}
            {bots.length > 0 && (
              <span className={`badge ${familyFilter ?? ''}`} style={{ fontSize: '0.75rem', padding: '3px 10px' }}>
                {runningCount} running
              </span>
            )}
          </h1>
          <p className="page-subtitle">{bots.length} bot{bots.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="page-actions">
          <Link href="/bots/create" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> New Bot
          </Link>
        </div>
      </div>

      {/* Family filter tabs */}
      <div className="family-tabs">
        <Link
          href="/bots"
          className={`family-tab all ${!familyFilter ? 'active' : ''}`}
        >
          All Bots
        </Link>
        {Object.entries(FAMILY_CONFIG).map(([family, cfg]) => (
          <Link
            key={family}
            href={`/bots?family=${family}`}
            className={`family-tab ${family} ${familyFilter === family ? 'active' : ''}`}
          >
            <span>{cfg.icon}</span>
            <span>{family.charAt(0).toUpperCase() + family.slice(1)}</span>
          </Link>
        ))}
      </div>

      {fetching && (
        <div className="bot-grid">
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-line w-60" />
              <div className="skeleton-line w-40" />
              <div className="skeleton-line w-80" />
            </div>
          ))}
        </div>
      )}

      {!fetching && bots.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">{currentConfig?.icon ?? '◈'}</div>
          <div className="empty-state-title">No {familyFilter ?? ''} bots yet</div>
          <div className="empty-state-desc">
            {currentConfig?.emptyDesc ?? 'Create your first bot to start automating.'}
          </div>
          <Link href="/bots/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Create Bot
          </Link>
        </div>
      )}

      {!fetching && bots.length > 0 && (
        <div className="bot-grid">
          {bots.map((bot) => (
            <BotCard key={bot.id} bot={bot} onAction={handleAction} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

