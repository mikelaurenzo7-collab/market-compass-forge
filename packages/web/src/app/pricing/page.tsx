'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';

interface PricingPlan {
  family: string;
  tier: string;
  monthlyUsd: number;
  includedUsageUsd: number;
}

const FAMILY_INFO: Record<string, { icon: string; tagline: string; features: Record<string, string[]> }> = {
  trading: {
    icon: '📈',
    tagline: 'Autonomous trading across crypto, equities, and prediction markets',
    features: {
      starter: ['1 bot', '5 strategies', 'Paper trading', 'Daily reports', 'Email support'],
      pro: ['5 bots', 'All strategies', 'Live trading', 'Real-time alerts', 'Priority support', 'API access'],
      enterprise: ['Unlimited bots', 'Custom strategies', 'Co-location', 'Dedicated account manager', '99.9% SLA', 'SSO & audit logs'],
    },
  },
  store: {
    icon: '🛒',
    tagline: 'Smart ecommerce operations across all major marketplaces',
    features: {
      starter: ['1 bot', '3 strategies', '1 marketplace', 'Weekly reports', 'Email support'],
      pro: ['10 bots', 'All strategies', '3 marketplaces', 'Real-time sync', 'Priority support', 'API access'],
      enterprise: ['Unlimited bots', 'Custom integrations', 'All marketplaces', 'Dedicated CSM', '99.9% SLA', 'SSO & audit logs'],
    },
  },
  social: {
    icon: '📱',
    tagline: 'Automated content, engagement, and analytics across platforms',
    features: {
      starter: ['1 bot', '2 strategies', '1 platform', 'Weekly analytics', 'Email support'],
      pro: ['10 bots', 'All strategies', '3 platforms', 'Real-time analytics', 'Priority support', 'API access'],
      enterprise: ['Unlimited bots', 'Custom workflows', 'All platforms', 'Dedicated CSM', '99.9% SLA', 'SSO & audit logs'],
    },
  },
  workforce: {
    icon: '🏢',
    tagline: 'General-purpose autonomous operators for business workflows',
    features: {
      starter: ['1 bot', 'Basic automations', '100 actions/day', 'Weekly reports', 'Email support'],
      pro: ['10 bots', 'Advanced workflows', '1,000 actions/day', 'Real-time monitoring', 'Priority support', 'API access'],
      enterprise: ['Unlimited bots', 'Custom pipelines', 'Unlimited actions', 'Dedicated engineer', '99.9% SLA', 'SSO & audit logs'],
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
  const [selectedFamily, setSelectedFamily] = useState('trading');
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    let apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';
    if (typeof window !== 'undefined') {
      const localhostApi = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(apiBase);
      const pageOnLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      if (localhostApi && !pageOnLocalhost) apiBase = '';
    }
    fetch(`${apiBase}/api/pricing`).then(r => r.json()).then(json => {
      if (json.data) setPlans(json.data);
    }).catch(() => {});
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
          Simple, transparent pricing
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: 560, margin: '0 auto 32px' }}>
          Start with paper mode for free during beta. Pay only when you go live.
        </p>

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
                  ${price.toLocaleString()}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>/mo</span>
              </div>

              {plan && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 24 }}>
                  Includes ${plan.includedUsageUsd.toLocaleString()} usage credits
                </div>
              )}

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                {features.map(f => (
                  <li key={f} style={{ padding: '6px 0', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--accent-green)', fontSize: '0.9rem' }}>✓</span> {f}
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
        All plans include paper mode, safety guardrails, and 5-layer risk pipeline.
        <br />
        Enterprise plans include SLA, SSO, dedicated support, and custom integrations.
      </div>
    </div>
  );
}
