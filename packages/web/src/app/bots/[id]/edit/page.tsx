'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '../../../../lib/auth-context';
import AppShell from '../../../components/AppShell';
import LoadingScreen from '../../../components/LoadingScreen';

const STRATEGIES: Record<string, { id: string; name: string }[]> = {
  trading: [
    { id: 'dca', name: 'Dollar Cost Average' },
    { id: 'momentum', name: 'Momentum' },
    { id: 'mean_reversion', name: 'Mean Reversion' },
    { id: 'grid', name: 'Grid Trading' },
    { id: 'arbitrage', name: 'Arbitrage' },
    { id: 'market_making', name: 'Market Making' },
    { id: 'event_probability', name: 'Event Probability' },
  ],
  store: [
    { id: 'dynamic_pricing', name: 'Dynamic Pricing' },
    { id: 'inventory_forecast', name: 'Inventory Forecast' },
    { id: 'listing_optimization', name: 'Listing Optimization' },
    { id: 'competitor_monitoring', name: 'Competitor Monitor' },
    { id: 'cross_platform_sync', name: 'Cross-Platform Sync' },
    { id: 'review_management', name: 'Review Management' },
  ],
  social: [
    { id: 'content_calendar', name: 'Content Calendar' },
    { id: 'engagement_automation', name: 'Engagement Auto' },
    { id: 'trend_detection', name: 'Trend Detection' },
    { id: 'audience_analytics', name: 'Audience Analytics' },
    { id: 'hashtag_optimization', name: 'Hashtag Optimization' },
    { id: 'cross_post_optimization', name: 'Cross-Post' },
  ],
  workforce: [
    { id: 'task_triage', name: 'Task Triage' },
    { id: 'report_generation', name: 'Report Generation' },
    { id: 'escalation_routing', name: 'Escalation Routing' },
    { id: 'onboarding_automation', name: 'Onboarding Automation' },
    { id: 'data_sync', name: 'Data Sync' },
    { id: 'compliance_monitoring', name: 'Compliance Monitoring' },
  ],
};

export default function EditBotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading, apiFetch } = useAuth();
  const router = useRouter();

  const [bot, setBot] = useState<any>(null);
  const [name, setName] = useState('');
  const [strategy, setStrategy] = useState('');
  const [strategies, setStrategies] = useState<string[]>([]);
  const [paperMode, setPaperMode] = useState(true);
  const [autonomy, setAutonomy] = useState('manual');
  const [maxPositionSizeUsd, setMaxPositionSizeUsd] = useState('100');
  const [maxDailyLossUsd, setMaxDailyLossUsd] = useState('500');
  const [stopLossPercent, setStopLossPercent] = useState('10');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchBot = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/bots/${id}`);
      const json = await res.json();
      if (json.success) {
        const b = json.data;
        setBot(b);
        setName(b.name);
        const cfg = b.config ?? {};
        setPaperMode(cfg.paperTrading ?? cfg.paperMode ?? true);
        setAutonomy(cfg.autonomyLevel ?? 'manual');
        setMaxPositionSizeUsd(String(cfg.maxPositionSizeUsd ?? 100));
        setMaxDailyLossUsd(String(cfg.maxDailyLossUsd ?? 500));
        setStopLossPercent(String((cfg.stopLossPercent ?? 0.1) * 100));
        if (b.family === 'trading') {
          setStrategy(cfg.strategy ?? 'dca');
        } else {
          setStrategies(cfg.strategies ?? []);
        }
      }
    } catch { /* ignore */ }
  }, [apiFetch, id]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    fetchBot();
  }, [user, loading, router, fetchBot]);

  function toggleStrategy(sid: string) {
    if (bot?.family === 'trading') {
      setStrategy(sid);
    } else {
      setStrategies(prev => prev.includes(sid) ? prev.filter(s => s !== sid) : [...prev, sid]);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Bot name is required'); return; }
    setError('');
    setSaving(true);
    setSaved(false);

    const config: Record<string, unknown> = {
      paperTrading: paperMode,
      paperMode: paperMode,
      autonomyLevel: autonomy,
    };

    if (bot.family === 'trading') {
      config.strategy = strategy;
      config.maxPositionSizeUsd = Number(maxPositionSizeUsd);
      config.maxDailyLossUsd = Number(maxDailyLossUsd);
      config.stopLossPercent = Number(stopLossPercent) / 100;
    } else {
      config.strategies = strategies;
    }

    try {
      const res = await apiFetch(`/api/bots/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, config }),
      });
      const json = await res.json();
      if (json.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(json.error || 'Failed to save');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user || !bot) return <LoadingScreen />;

  const familyStrategies = STRATEGIES[bot.family] ?? [];

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="page-header-row" style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <Link href={`/bots/${id}`} style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="page-title">Edit Bot</h1>
              <p className="page-subtitle">{bot.platform} · {bot.family}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave}>
          {error && (
            <div className="error-banner" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-sm) var(--space-md)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          {/* Bot Name */}
          <div className="settings-section">
            <div className="settings-section-title">Bot Name</div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              style={{ width: '100%', maxWidth: '400px', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem' }}
              placeholder="Enter bot name"
            />
          </div>

          {/* Strategy */}
          <div className="settings-section">
            <div className="settings-section-title">Strategy</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-sm)' }}>
              {familyStrategies.map(s => {
                const isActive = bot.family === 'trading' ? strategy === s.id : strategies.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleStrategy(s.id)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${isActive ? 'var(--green)' : 'rgba(255,255,255,0.1)'}`,
                      background: isActive ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
                      color: isActive ? 'var(--green)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: isActive ? 600 : 400,
                      textAlign: 'left',
                    }}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trading-specific config */}
          {bot.family === 'trading' && (
            <div className="settings-section">
              <div className="settings-section-title">Risk Parameters</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Max Position Size (USD)</label>
                  <input type="number" value={maxPositionSizeUsd} onChange={e => setMaxPositionSizeUsd(e.target.value)} min="1" style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Max Daily Loss (USD)</label>
                  <input type="number" value={maxDailyLossUsd} onChange={e => setMaxDailyLossUsd(e.target.value)} min="1" style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Stop Loss (%)</label>
                  <input type="number" value={stopLossPercent} onChange={e => setStopLossPercent(e.target.value)} min="0.1" step="0.1" style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                </div>
              </div>
            </div>
          )}

          {/* Mode & Autonomy */}
          <div className="settings-section">
            <div className="settings-section-title">Execution Mode</div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Trading Mode</label>
                <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                  {(['paper', 'live'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaperMode(mode === 'paper')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: `1px solid ${(mode === 'paper') === paperMode ? 'var(--green)' : 'rgba(255,255,255,0.1)'}`,
                        background: (mode === 'paper') === paperMode ? 'rgba(16,185,129,0.08)' : 'transparent',
                        color: (mode === 'paper') === paperMode ? 'var(--green)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        textTransform: 'capitalize',
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Autonomy Level</label>
                <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                  {['manual', 'supervised', 'auto'].map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setAutonomy(level)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: `1px solid ${level === autonomy ? 'var(--green)' : 'rgba(255,255,255,0.1)'}`,
                        background: level === autonomy ? 'rgba(16,185,129,0.08)' : 'transparent',
                        color: level === autonomy ? 'var(--green)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        textTransform: 'capitalize',
                      }}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {saved && <span style={{ color: 'var(--green)', fontSize: '0.85rem' }}>✓ Changes saved</span>}
          </div>
        </form>
      </motion.div>
    </AppShell>
  );
}
