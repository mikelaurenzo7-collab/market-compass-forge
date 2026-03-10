'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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

const FAMILY_LABELS: Record<string, string> = {
  trading: 'Trading Operators',
  store: 'Store Operators',
  social: 'Social Operators',
};

function StatusDot({ status }: { status: string }) {
  return <span className={`status-dot ${status}`} title={status} />;
}

export default function BotsPage() {
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

  const title = familyFilter ? (FAMILY_LABELS[familyFilter] ?? 'Bots') : 'All Bots';

  return (
    <AppShell>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{bots.length} bot{bots.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="page-actions">
          <Link href="/bots/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            + New Bot
          </Link>
        </div>
      </div>

      {/* Family filter tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
        <Link href="/bots" className={`btn ${!familyFilter ? 'btn-primary' : 'btn-secondary'}`} style={{ textDecoration: 'none' }}>All</Link>
        <Link href="/bots?family=trading" className={`btn ${familyFilter === 'trading' ? 'btn-primary' : 'btn-secondary'}`} style={{ textDecoration: 'none' }}>Trading</Link>
        <Link href="/bots?family=store" className={`btn ${familyFilter === 'store' ? 'btn-primary' : 'btn-secondary'}`} style={{ textDecoration: 'none' }}>Store</Link>
        <Link href="/bots?family=social" className={`btn ${familyFilter === 'social' ? 'btn-primary' : 'btn-secondary'}`} style={{ textDecoration: 'none' }}>Social</Link>
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
          <div className="empty-state-icon">◈</div>
          <div className="empty-state-title">No bots found</div>
          <div className="empty-state-desc">Create your first bot to start automating.</div>
          <Link href="/bots/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Create Bot
          </Link>
        </div>
      )}

      {!fetching && bots.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Family</th>
              <th>Platform</th>
              <th>Status</th>
              <th>Strategies</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bots.map((bot) => (
              <tr key={bot.id}>
                <td>
                  <Link href={`/bots/${bot.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600 }}>
                    {bot.name}
                  </Link>
                </td>
                <td><span className={`badge ${bot.family}`}>{bot.family}</span></td>
                <td>{bot.platform}</td>
                <td><StatusDot status={bot.status} /> {bot.status}</td>
                <td>
                  {(bot.strategies ?? []).map((s) => (
                    <span key={s} className="strategy-tag" style={{ marginRight: '4px' }}>
                      {s.replace(/_/g, ' ')}
                    </span>
                  ))}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {bot.status === 'running' ? (
                      <>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleAction(bot.id, 'pause')}>Pause</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleAction(bot.id, 'stop')}>Stop</button>
                      </>
                    ) : bot.status === 'paused' ? (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => handleAction(bot.id, 'start')}>Resume</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleAction(bot.id, 'stop')}>Stop</button>
                      </>
                    ) : (
                      <button className="btn btn-primary btn-sm" onClick={() => handleAction(bot.id, 'start')}>Start</button>
                    )}
                    {bot.status !== 'running' && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(bot.id)}>Delete</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
