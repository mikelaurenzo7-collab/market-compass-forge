'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrendingUp, ShoppingCart, Share2, Users, Check } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

interface PricingPlan {
  family: string;
  tier: string;
  monthlyUsd: number;
  includedUsageUsd: number;
  maxBots: number;
  addOnBotUsd: number;
}

const FAMILY_ICONS: Record<string, React.ReactNode> = {
  trading: <TrendingUp size={18} />,
  store: <ShoppingCart size={18} />,
  social: <Share2 size={18} />,
  workforce: <Users size={18} />,
};

const FAMILY_INFO: Record<string, { icon: React.ReactNode; tagline: string; features: Record<string, string[]> }> = {
  trading: {
    icon: FAMILY_ICONS.trading,
    tagline: 'Autonomous trading across crypto, equities, and prediction markets',
    features: {
      starter: ['1 dedicated bot', '5 strategies', 'Paper trading', 'Daily reports', 'Email support'],
      pro: ['Up to 3 bots', 'All strategies', 'Live trading', 'Real-time alerts', 'Priority support', 'API access', 'Add more bots at $299/mo each'],
      enterprise: ['Up to 10 bots', 'Custom strategies', 'Co-location', 'Dedicated account manager', '99.9% SLA', 'SSO & audit logs', 'Add more bots at $199/mo each'],
    },
  },
  store: {
    icon: FAMILY_ICONS.store,
    tagline: 'Smart ecommerce operations — one bot per store, fully dedicated',
    features: {
      starter: ['1 dedicated bot', '3 strategies', '1 store', 'Weekly reports', 'Email support'],
      pro: ['Up to 3 bots', 'All strategies', '3 stores', 'Real-time sync', 'Priority support', 'API access', 'Add more bots at $179/mo each'],
      enterprise: ['Up to 10 bots', 'Custom integrations', 'All stores', 'Dedicated CSM', '99.9% SLA', 'SSO & audit logs', 'Add more bots at $119/mo each'],
    },
  },
  social: {
    icon: FAMILY_ICONS.social,
    tagline: 'Automated content, engagement, and analytics — one bot per account',
    features: {
      starter: ['1 dedicated bot', '2 strategies', '1 account', 'Weekly analytics', 'Email support'],
      pro: ['Up to 5 bots', 'All strategies', '5 accounts', 'Real-time analytics', 'Priority support', 'API access', 'Add more bots at $79/mo each'],
      enterprise: ['Up to 15 bots', 'Custom workflows', 'Unlimited accounts', 'Dedicated CSM', '99.9% SLA', 'SSO & audit logs', 'Add more bots at $49/mo each'],
    },
  },
  workforce: {
    icon: FAMILY_ICONS.workforce,
    tagline: 'General-purpose autonomous operators for business workflows',
    features: {
      starter: ['1 dedicated bot', 'Basic automations', '100 actions/day', 'Weekly reports', 'Email support'],
      pro: ['Up to 3 bots', 'Advanced workflows', '1,000 actions/day', 'Real-time monitoring', 'Priority support', 'API access', 'Add more bots at $599/mo each'],
      enterprise: ['Up to 10 bots', 'Custom pipelines', 'Unlimited actions', 'Dedicated engineer', '99.9% SLA', 'SSO & audit logs', 'Add more bots at $399/mo each'],
    },
  },
};

const TIER_META: Record<string, { label: string; badge?: string }> = {
  starter: { label: 'Starter' },
  pro: { label: 'Pro', badge: 'Popular' },
  enterprise: { label: 'Enterprise' },
};

export default function PricingPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [selectedFamily, setSelectedFamily] = useState('store');
  const [annual, setAnnual] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [pricingError, setPricingError] = useState('');

  useEffect(() => {
<<<<<<< HEAD
    let apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';
    if (typeof window !== 'undefined') {
      const localhostApi = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(apiBase);
      const pageOnLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      if (localhostApi && !pageOnLocalhost) apiBase = '';
    }
    fetch(`${apiBase}/api/pricing`).then(r => r.json()).then(json => {
      if (json.data) setPlans(json.data);
    }).catch(() => {});
=======
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    setPricingError('');
    setLoadingPlans(true);
    fetch(`${apiBase}/api/pricing`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Pricing request failed (${r.status})`);
        return r.json();
      })
      .then((json) => {
        if (json.data) {
          setPlans(json.data);
          return;
        }
        throw new Error(json.error ?? 'Pricing is unavailable right now');
      })
      .catch((err) => {
        console.error('Failed to load pricing plans:', err);
        setPricingError('Pricing is temporarily unavailable. Please try again shortly.');
      })
      .finally(() => setLoadingPlans(false));
>>>>>>> f42fb9ea410432b2e524632c6241d5d491145662
  }, []);

  const familyPlans = plans.filter(p => p.family === selectedFamily);
  const info = FAMILY_INFO[selectedFamily];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0a0a0f)', color: 'var(--text-primary, #e8e8ed)' }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px', borderBottom: '1px solid var(--border-primary, #1a1a2e)',
      }}>
        <Link href="/" style={{ color: 'var(--accent-green, #00ff88)', fontWeight: 800, fontSize: '1.2rem', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
          BeastBots
        </Link>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {user ? (
            <Link href="/" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>Dashboard</Link>
          ) : (
            <>
              <Link href="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem' }}>Log in</Link>
              <Link href="/signup" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>Get Started</Link>
            </>
          )}
        </div>
      </nav>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '60px 20px 40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 12 }}>
          Pricing built around measurable ROI
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: 560, margin: '0 auto 32px' }}>
          Start with Store Operators, prove margin and revenue impact, then expand into adjacent operator lanes on the same platform.
        </p>

        <div style={{ maxWidth: 760, margin: '0 auto 28px', padding: '14px 18px', borderRadius: 14, border: '1px solid rgba(0,232,123,0.18)', background: 'rgba(0,232,123,0.05)', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          Recommended launch wedge: <span style={{ color: 'var(--color-store)', fontWeight: 700 }}>Store Operators</span> for ecommerce brands that need margin protection, pricing discipline, and inventory-aware automation.
        </div>

        {/* Annual toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
          <span style={{ color: !annual ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 500 }}>Monthly</span>
          <button
            type="button"
            onClick={() => setAnnual(!annual)}
            style={{
              width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
              background: annual ? 'var(--accent-green)' : 'var(--border-primary)',
              position: 'relative', transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: annual ? 25 : 3,
              width: 20, height: 20, borderRadius: '50%', background: 'white',
              transition: 'left 0.2s',
            }} />
          </button>
          <span style={{ color: annual ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 500 }}>
            Annual <span style={{ color: 'var(--accent-green)', fontSize: '0.8rem', fontWeight: 600 }}>Save 20%</span>
          </span>
        </div>

        {/* Family tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(FAMILY_INFO).map(([key, val]) => (
            <button
              key={key}
              type="button"
              className={`btn ${selectedFamily === key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedFamily(key)}
              style={{ fontSize: '0.85rem' }}
            >
              {val.icon} {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {info && (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 40, fontSize: '0.95rem' }}>
          {info.tagline}
        </p>
      )}

      {pricingError && (
        <div style={{ maxWidth: 640, margin: '0 auto 24px', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)', color: '#fca5a5', textAlign: 'center' }}>
          {pricingError}
        </div>
      )}

      {loadingPlans && (
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 40px', color: 'var(--text-muted)', textAlign: 'center' }}>
          Loading pricing plans...
        </div>
      )}

      {/* Pricing cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 24, maxWidth: 960, margin: '0 auto', padding: '0 24px 80px',
      }}>
        {['starter', 'pro', 'enterprise'].map(tier => {
          const plan = familyPlans.find(p => p.tier === tier);
          const meta = TIER_META[tier];
          const features = info?.features[tier] ?? [];
          const price = plan ? (annual ? Math.round(plan.monthlyUsd * 0.8) : plan.monthlyUsd) : 0;
          const isPro = tier === 'pro';

          return (
            <div
              key={tier}
              style={{
                border: `1px solid ${isPro ? 'var(--accent-green)' : 'var(--border-primary)'}`,
                borderRadius: 12,
                padding: 32,
                background: isPro ? 'rgba(0, 255, 136, 0.03)' : 'var(--bg-secondary, #12121f)',
                position: 'relative',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {meta?.badge && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--accent-green)', color: '#000', fontSize: '0.7rem',
                  fontWeight: 700, padding: '4px 14px', borderRadius: 20, letterSpacing: '0.05em',
                }}>
                  {meta.badge}
                </div>
              )}

              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                {meta?.label}
              </div>

              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                  {loadingPlans ? '...' : `$${price.toLocaleString()}`}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>/mo</span>
              </div>

              {!loadingPlans && plan && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  Includes ${plan.includedUsageUsd.toLocaleString()} usage credits
                </div>
              )}

              {!loadingPlans && plan && (
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-green)', marginBottom: 24, fontWeight: 600 }}>
                  {plan.maxBots === 1
                    ? '1 dedicated bot included'
                    : `Up to ${plan.maxBots} bots included`}
                  {plan.addOnBotUsd > 0 && (
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                      {' '}· +${plan.addOnBotUsd}/mo per extra bot
                    </span>
                  )}
                </div>
              )}

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                {features.map(f => (
                  <li key={f} style={{ padding: '6px 0', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Check size={14} style={{ color: 'var(--accent-green)', flexShrink: 0 }} /> {f}
                  </li>
                ))}
              </ul>

              <Link
                href={tier === 'enterprise' ? '/signup?plan=enterprise' : '/signup'}
                className={`btn ${isPro ? 'btn-primary' : 'btn-secondary'}`}
                style={{ textAlign: 'center', width: '100%', marginTop: 24, textDecoration: 'none', display: 'block' }}
              >
                {tier === 'enterprise' ? 'Contact Sales' : 'Get Started'}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid var(--border-primary)', padding: '32px 24px',
        textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem',
      }}>
        All plans include paper mode, 5-layer safety guardrails, and ROI-aware analytics.
        <br />
        Enterprise plans include SLA, SSO, dedicated support, custom integrations, and rollout planning.
      </div>
    </div>
  );
}
