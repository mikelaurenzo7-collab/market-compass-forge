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
import { BotListCard } from '../components/BotCard';
import { FAMILY_CONFIG } from '../components/PlatformIdentity';

interface Bot {
  id: string;
  name: string;
  family: string;
  platform: string;
  status: string;
  strategies: string[];
  createdAt: string;
}

function StatusDot({ status }: { status: string }) {
  return <span className={`status-dot ${status}`} title={status} />;
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

  const EMPTY_DESCS: Record<string, string> = {
    trading: 'Deploy a trading bot on Coinbase, Binance, Alpaca, Kalshi, or Polymarket.',
    store: 'Automate pricing, inventory, and listings on Shopify, Amazon, Etsy, and more.',
    social: 'Schedule content, track engagement, and grow your audience on every platform.',
    workforce: 'Automate team operations via Slack, Notion, Jira, Salesforce, and more.',
  };

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
            {(familyFilter && EMPTY_DESCS[familyFilter]) ?? 'Create your first bot to start automating.'}
          </div>
          <Link href="/bots/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Create Bot
          </Link>
        </div>
      )}

      {!fetching && bots.length > 0 && (
        <div className="bot-grid">
          {bots.map((bot) => (
            <BotListCard key={bot.id} bot={bot} onAction={handleAction} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

