'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrendingUp, ShoppingCart, Share2, Users, ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import AppShell from '../../components/AppShell';

const CREATE_FAMILY_ICONS: Record<string, React.ReactNode> = {
  trading: <TrendingUp size={20} />,
  store: <ShoppingCart size={20} />,
  social: <Share2 size={20} />,
  workforce: <Users size={20} />,
};

const FAMILY_META: Record<string, { icon: React.ReactNode; label: string; desc: string; color: string }> = {
  trading: { icon: CREATE_FAMILY_ICONS.trading, label: 'Trading', desc: 'Crypto & stock exchanges', color: 'var(--color-trading)' },
  store: { icon: CREATE_FAMILY_ICONS.store, label: 'Store', desc: 'Ecommerce & marketplaces', color: 'var(--color-store)' },
  social: { icon: CREATE_FAMILY_ICONS.social, label: 'Social', desc: 'Social media platforms', color: 'var(--color-social)' },
  workforce: { icon: CREATE_FAMILY_ICONS.workforce, label: 'Workforce', desc: 'Team & operations tools', color: 'var(--color-workforce)' },
};

const PLATFORMS: Record<string, { id: string; name: string }[]> = {
  trading: [
    { id: 'coinbase', name: 'Coinbase' },
    { id: 'binance', name: 'Binance' },
    { id: 'alpaca', name: 'Alpaca' },
    { id: 'kalshi', name: 'Kalshi' },
    { id: 'polymarket', name: 'Polymarket' },
  ],
  store: [
    { id: 'shopify', name: 'Shopify' },
    { id: 'amazon', name: 'Amazon' },
    { id: 'etsy', name: 'Etsy' },
    { id: 'ebay', name: 'eBay' },
    { id: 'square', name: 'Square' },
    { id: 'woocommerce', name: 'WooCommerce' },
  ],
  social: [
    { id: 'x', name: 'X / Twitter' },
    { id: 'tiktok', name: 'TikTok' },
    { id: 'instagram', name: 'Instagram' },
    { id: 'facebook', name: 'Facebook' },
    { id: 'linkedin', name: 'LinkedIn' },
    { id: 'youtube', name: 'YouTube' },
  ],
  workforce: [
    { id: 'slack', name: 'Slack' },
    { id: 'teams', name: 'Teams' },
    { id: 'notion', name: 'Notion' },
    { id: 'jira', name: 'Jira' },
    { id: 'github', name: 'GitHub' },
    { id: 'salesforce', name: 'Salesforce' },
    { id: 'hubspot', name: 'HubSpot' },
    { id: 'gmail', name: 'Gmail' },
  ],
};

const STRATEGIES: Record<string, { id: string; name: string; desc: string }[]> = {
  trading: [
    { id: 'dca', name: 'Dollar Cost Average', desc: 'Automated periodic buys to reduce timing risk' },
    { id: 'momentum', name: 'Momentum', desc: 'Buy trending assets using RSI, MACD, and volume signals' },
    { id: 'mean_reversion', name: 'Mean Reversion', desc: 'Fade overextended moves back to average price' },
    { id: 'grid', name: 'Grid Trading', desc: 'Place limit orders across a price grid for range-bound markets' },
    { id: 'arbitrage', name: 'Arbitrage', desc: 'Exploit price differences across venues' },
    { id: 'market_making', name: 'Market Making', desc: 'Provide liquidity by quoting both sides' },
    { id: 'event_probability', name: 'Event Probability', desc: 'Trade prediction/event contracts based on estimated fair value' },
  ],
  store: [
    { id: 'dynamic_pricing', name: 'Dynamic Pricing', desc: 'Auto-adjust prices based on demand, competition, and inventory' },
    { id: 'inventory_forecast', name: 'Inventory Forecast', desc: 'Predict stockouts and recommend reorder quantities' },
    { id: 'listing_optimization', name: 'Listing Optimization', desc: 'Score and improve product titles, tags, and descriptions' },
    { id: 'competitor_monitoring', name: 'Competitor Monitor', desc: 'Track competitor pricing and alert on undercuts' },
    { id: 'cross_platform_sync', name: 'Cross-Platform Sync', desc: 'Keep inventory and pricing synced across marketplaces' },
    { id: 'review_management', name: 'Review Management', desc: 'Monitor and respond to customer reviews' },
  ],
  social: [
    { id: 'content_calendar', name: 'Content Calendar', desc: 'Schedule and auto-publish content at optimal times' },
    { id: 'engagement_automation', name: 'Engagement Auto', desc: 'Boost engagement through automated activity' },
    { id: 'trend_detection', name: 'Trend Detection', desc: 'Identify trending topics relevant to your brand' },
    { id: 'audience_analytics', name: 'Audience Analytics', desc: 'Track follower growth, engagement, and demographics' },
    { id: 'hashtag_optimization', name: 'Hashtag Optimization', desc: 'Find and apply best-performing hashtags' },
    { id: 'cross_post_optimization', name: 'Cross-Post', desc: 'Optimize content for each platform format' },
  ],
  workforce: [
    { id: 'task_triage', name: 'Task Triage', desc: 'Auto-prioritize and assign incoming tasks based on rules' },
    { id: 'report_generation', name: 'Report Generation', desc: 'Auto-generate daily/weekly status reports' },
    { id: 'escalation_routing', name: 'Escalation Routing', desc: 'Detect blockers and escalate to the right person' },
    { id: 'onboarding_automation', name: 'Onboarding Automation', desc: 'Automate new-hire tasks, docs, and tool provisioning' },
    { id: 'data_sync', name: 'Data Sync', desc: 'Keep records in sync across CRM, PM, and comms tools' },
    { id: 'compliance_monitoring', name: 'Compliance Monitoring', desc: 'Detect policy violations and flag for review' },
  ],
};



export default function CreateBotPage() {
  const { user, loading, apiFetch } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [family, setFamily] = useState('trading');
  const [platform, setPlatform] = useState('');
  const [name, setName] = useState('');
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
  const [paperMode, setPaperMode] = useState(true);
  const [autonomy, setAutonomy] = useState('manual');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);

  const fetchConnected = useCallback(async () => {
    try {
      const res = await apiFetch('/api/credentials');
      const json = await res.json();
      setConnectedPlatforms((json.data ?? []).map((c: any) => c.platform));
    } catch { /* ignore */ }
  }, [apiFetch]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    fetchConnected();
  }, [user, loading, router, fetchConnected]);

  useEffect(() => {
    setPlatform('');
    setSelectedStrategies([]);
  }, [family]);

  function toggleStrategy(id: string) {
    if (family === 'trading') {
      setSelectedStrategies([id]); // single strategy for trading
    } else {
      setSelectedStrategies(prev =>
        prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!platform) { setError('Select a platform'); return; }
    if (!name.trim()) { setError('Enter a bot name'); return; }

    setError('');
    setCreating(true);

    const config: Record<string, unknown> = {
      paperTrading: paperMode,
      paperMode: paperMode,
      autonomyLevel: autonomy,
    };

    if (family === 'trading') {
      config.strategy = selectedStrategies[0] ?? 'dca';
    } else {
      const defaults: Record<string, string> = { store: 'dynamic_pricing', social: 'content_calendar', workforce: 'task_triage' };
      config.strategies = selectedStrategies.length > 0 ? selectedStrategies : [defaults[family] ?? 'task_triage'];
    }

    try {
      const res = await apiFetch('/api/bots', {
        method: 'POST',
        body: JSON.stringify({ family, platform, name: name.trim(), config }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? 'Failed to create bot');
        setCreating(false);
        return;
      }
      router.push(`/bots/${json.data.id}`);
    } catch {
      setError('Network error');
      setCreating(false);
    }
  }

  if (loading || !user) return null;

  const availablePlatforms = PLATFORMS[family] ?? [];
  const availableStrategies = STRATEGIES[family] ?? [];
  const currentFamilyMeta = FAMILY_META[family];

  return (
    <AppShell>
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <Link href="/bots" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={14} /> Back to Bots
        </Link>
      </div>

      <div style={{ maxWidth: 680 }}>
        <h1 className="page-title">Create a New Bot</h1>
        <p className="page-subtitle" style={{ marginBottom: 'var(--space-lg)' }}>
          Step {step} of 3 — {step === 1 ? 'Choose family & platform' : step === 2 ? 'Select strategies' : 'Configure & name'}
        </p>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-xl)' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: s <= step ? (currentFamilyMeta?.color ?? 'var(--green)') : 'var(--border-primary)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {error && <div className="auth-error" style={{ marginBottom: 'var(--space-md)' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Step 1: Family + Platform */}
          {step === 1 && (
            <>
              <label className="auth-label" style={{ marginBottom: 'var(--space-lg)' }}>
                Bot Family
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
                  {Object.entries(FAMILY_META).map(([f, meta]) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFamily(f)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 4,
                        padding: 'var(--space-md)',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${family === f ? meta.color : 'var(--border-default)'}`,
                        background: family === f ? `${meta.color}10` : 'var(--bg-primary)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                        fontFamily: 'var(--font-sans)',
                        color: 'var(--text-primary)',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: '1.25rem' }}>{meta.icon}</span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: family === f ? meta.color : 'var(--text-primary)' }}>{meta.label}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{meta.desc}</span>
                    </button>
                  ))}
                </div>
              </label>

              <label className="auth-label">
                Platform
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
                  {availablePlatforms.map((p) => {
                    const connected = connectedPlatforms.includes(p.id);
                    const isSelected = platform === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPlatform(p.id)}
                        style={{
                          position: 'relative',
                          textAlign: 'center',
                          padding: 'var(--space-sm) var(--space-md)',
                          borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${isSelected ? (currentFamilyMeta?.color ?? 'var(--green)') : 'var(--border-default)'}`,
                          background: isSelected ? `${currentFamilyMeta?.color ?? 'var(--green)'}15` : 'var(--bg-elevated)',
                          color: isSelected ? (currentFamilyMeta?.color ?? 'var(--green)') : 'var(--text-primary)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          fontFamily: 'var(--font-sans)',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        {p.name}
                        {connected && (
                          <span style={{ position: 'absolute', top: 4, right: 6, fontSize: '0.5rem', color: 'var(--green)' }}>●</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {platform && !connectedPlatforms.includes(platform) && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', marginTop: 'var(--space-xs)', display: 'block' }}>
                    ⚠ Not connected — bot will run in paper mode. <Link href="/integrations" style={{ color: currentFamilyMeta?.color ?? 'var(--green)' }}>Connect it in Integrations</Link>
                  </span>
                )}
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-xl)' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!platform}
                  onClick={() => { setError(''); setStep(2); }}
                  style={{ background: currentFamilyMeta?.color ?? 'var(--green)' }}
                >
                  Next →
                </button>
              </div>
            </>
          )}

          {/* Step 2: Strategies */}
          {step === 2 && (
            <>
              <label className="auth-label">
                {family === 'trading' ? 'Strategy' : 'Strategies'}{' '}
                {family !== 'trading' && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(select multiple)</span>}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
                {availableStrategies.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    className="connect-card"
                    onClick={() => toggleStrategy(s.id)}
                    style={{
                      cursor: 'pointer',
                      borderColor: selectedStrategies.includes(s.id) ? (currentFamilyMeta?.color ?? 'var(--green)') : undefined,
                      background: selectedStrategies.includes(s.id) ? `${currentFamilyMeta?.color ?? 'var(--green)'}08` : undefined,
                    }}
                  >
                    <div className="connect-info">
                      <span className="connect-name">{s.name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.desc}</span>
                    </div>
                    <span style={{ color: selectedStrategies.includes(s.id) ? (currentFamilyMeta?.color ?? 'var(--green)') : 'var(--text-muted)', fontSize: '1.2rem' }}>
                      {selectedStrategies.includes(s.id) ? <Check size={18} /> : '○'}
                    </span>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-xl)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => { setError(''); setStep(3); }}
                  style={{ background: currentFamilyMeta?.color ?? 'var(--green)' }}
                >
                  Next →
                </button>
              </div>
            </>
          )}

          {/* Step 3: Config + Name */}
          {step === 3 && (
            <>
              <label className="auth-label">
                Bot Name
                <input
                  type="text"
                  className="auth-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    family === 'trading' ? 'e.g. Momentum Alpha' :
                    family === 'store' ? 'e.g. Price Optimizer' :
                    family === 'social' ? 'e.g. Content Publisher' :
                    'e.g. Task Automator'
                  }
                  required
                  autoFocus
                />
              </label>

              <label className="auth-label" style={{ marginTop: 'var(--space-md)' }}>
                Autonomy Level
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
                  {[
                    { id: 'manual', label: 'Manual', desc: 'You control everything' },
                    { id: 'suggest', label: 'Suggest', desc: 'Bot recommends, you approve' },
                    { id: 'auto', label: 'Auto', desc: 'Full autonomous operation' },
                  ].map(a => (
                    <button
                      key={a.id}
                      type="button"
                      className={`btn ${autonomy === a.id ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setAutonomy(a.id)}
                      style={{
                        flex: 1, flexDirection: 'column', display: 'flex', alignItems: 'center', gap: 2, padding: '10px 8px',
                        ...(autonomy === a.id ? { background: currentFamilyMeta?.color ?? 'var(--green)' } : {}),
                      }}
                    >
                      <span style={{ fontSize: '0.85rem' }}>{a.label}</span>
                      <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{a.desc}</span>
                    </button>
                  ))}
                </div>
              </label>

              {/* Paper mode: only relevant for trading + store */}
              {(family === 'trading' || family === 'store') && (
                <label className="auth-label" style={{ marginTop: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexDirection: 'row' }}>
                  <input
                    type="checkbox"
                    checked={paperMode}
                    onChange={(e) => setPaperMode(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: currentFamilyMeta?.color ?? 'var(--green)' }}
                  />
                  <div>
                    <span style={{ fontWeight: 600 }}>Paper Mode</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Simulate actions without real money — recommended for new bots
                    </span>
                  </div>
                </label>
              )}

              {/* Summary */}
              <div className="settings-section" style={{ marginTop: 'var(--space-lg)' }}>
                <div className="settings-section-title">Summary</div>
                <div className="settings-row">
                  <span className="settings-label">Family</span>
                  <span className="settings-value" style={{ color: currentFamilyMeta?.color }}>
                    {currentFamilyMeta?.icon} {family}
                  </span>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Platform</span>
                  <span className="settings-value">{platform}</span>
                </div>
                <div className="settings-row">
                  <span className="settings-label">{family === 'trading' ? 'Strategy' : 'Strategies'}</span>
                  <span className="settings-value">{selectedStrategies.length > 0 ? selectedStrategies.join(', ') : 'default'}</span>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Autonomy</span>
                  <span className="settings-value">{autonomy}</span>
                </div>
                {(family === 'trading' || family === 'store') && (
                  <div className="settings-row">
                    <span className="settings-label">Mode</span>
                    <span className="settings-value">{paperMode ? 'Paper (simulated)' : 'Live'}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-xl)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>← Back</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                  style={{ background: currentFamilyMeta?.color ?? 'var(--green)', minWidth: 120 }}
                >
                  {creating ? 'Creating...' : `Create ${currentFamilyMeta?.icon ?? ''} Bot`}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </AppShell>
  );
}
