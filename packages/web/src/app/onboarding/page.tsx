'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { TrendingUp, ShoppingCart, Share2, CheckCircle } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

const FAMILY_ICONS: Record<string, React.ReactNode> = {
  trading: <TrendingUp size={28} />,
  store: <ShoppingCart size={28} />,
  social: <Share2 size={28} />,
};

const FAMILIES = [
  { id: 'trading', title: 'Trading Operators', desc: 'Crypto, stocks, events & prediction markets', color: 'var(--green)' },
  { id: 'store', title: 'Store Operators', desc: 'Shopify, Amazon, Etsy, eBay & more', color: 'var(--blue)' },
  { id: 'social', title: 'Social Operators', desc: 'X, TikTok, Instagram, Facebook & LinkedIn', color: 'var(--purple)' },
  { id: 'workforce', title: 'Workforce Operators', desc: 'Slack, Notion, Asana, Jira & automation', color: 'var(--gold)' },
] as const;

// we'll fetch the same list from API so we can inspect the oauth flag
interface IntegrationData { id: string; displayName: string; oauth: boolean; category: string; status: string; }
const INTEGRATIONS: Record<string, IntegrationData[]> = {
  trading: [],
  store: [],
  social: [],
  workforce: [],
};

export default function OnboardingPage() {
  const { apiFetch, completeOnboarding } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [connectError, setConnectError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [available, setAvailable] = useState<IntegrationData[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/api/integrations');
        const json = await res.json();
        if (json.success) {
          setAvailable(json.data);
        }
      } catch {}
    }
    load();
  }, [apiFetch]);

  async function handleFamilySelect(family: string) {
    setSelectedFamily(family);
    await apiFetch('/api/onboarding', {
      method: 'PATCH',
      body: JSON.stringify({ currentStep: 1, selectedFamily: family }),
    });
    setStep(1);
  }

  async function handleIntegrationSelect(platform: string) {
    setSelectedIntegration(platform);
    setStep(2);
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedIntegration) return;
    // find record
    const info = available.find((i) => i.id === selectedIntegration);
    if (info?.oauth) {
      try {
        const res = await apiFetch(`/api/integrations/${selectedIntegration}/connect`, {
          headers: { Accept: 'application/json' },
        });
        const json = await res.json();
        if (json.success && json.url) {
          window.location.href = json.url;
        }
      } catch { /* ignore — user will see nothing happened */ }
      return;
    }
    setConnectError('');
    setConnecting(true);

    try {
      const res = await apiFetch(`/api/credentials/${selectedIntegration}`, {
        method: 'POST',
        body: JSON.stringify({ apiKey, apiSecret: apiSecret || undefined }),
      });
      const json = await res.json();
      if (!json.success) {
        setConnectError(json.error ?? 'Connection failed');
        setConnecting(false);
        return;
      }

      await apiFetch('/api/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({ currentStep: 3, firstIntegration: selectedIntegration }),
      });
      setConnecting(false);
      setStep(3);
    } catch {
      setConnectError('Network error');
      setConnecting(false);
    }
  }

  async function handleComplete() {
    await apiFetch('/api/onboarding', {
      method: 'PATCH',
      body: JSON.stringify({ completed: true }),
    });
    completeOnboarding();
    router.push('/');
  }

  async function handleSkip() {
    await apiFetch('/api/onboarding/skip', { method: 'POST' });
    completeOnboarding();
    router.push('/');
  }

  return (
    <div className="auth-page">
      <div className="onboarding-card">
        <div className="auth-logo">BeastBots</div>

        {/* Progress */}
        <div className="onboarding-progress">
          {[0, 1, 2, 3].map((s) => (
            <div key={s} className={`onboarding-step-dot ${step >= s ? 'active' : ''}`} />
          ))}
        </div>

        {/* Step 0: Choose Family */}
        {step === 0 && (
          <>
            <h1 className="auth-title">What do you want to automate?</h1>
            <p className="auth-subtitle">Pick your first operator family — you can add more later</p>
            <div className="onboarding-family-grid">
              {FAMILIES.map((f) => (
                <button
                  key={f.id}
                  className="onboarding-family-card"
                  onClick={() => handleFamilySelect(f.id)}
                  style={{ '--accent': f.color } as React.CSSProperties}
                >
                  <span className="onboarding-family-icon">{FAMILY_ICONS[f.id]}</span>
                  <span className="onboarding-family-title">{f.title}</span>
                  <span className="onboarding-family-desc">{f.desc}</span>
                </button>
              ))}
            </div>
            <button onClick={handleSkip} className="auth-skip">Skip setup for now</button>
          </>
        )}

        {/* Step 1: Choose Integration */}
        {step === 1 && selectedFamily && (
          <>
            <h1 className="auth-title">Connect your first platform</h1>
            <p className="auth-subtitle">Choose a platform to connect</p>
            <div className="onboarding-integration-grid">
              {available
                .filter((int) => {
                const categoryMap: Record<string, string> = { trading: 'trading', store: 'ecommerce', social: 'social', workforce: 'workforce' };
                return int.category === (categoryMap[selectedFamily] ?? selectedFamily);
              })
                .map((int) => (
                  <button
                    key={int.id}
                    className="onboarding-integration-card"
                    onClick={() => handleIntegrationSelect(int.id)}
                  >
                    {int.displayName}
                  </button>
                ))}
            </div>
            <div className="onboarding-nav">
              <button onClick={() => setStep(0)} className="auth-back">Back</button>
              <button onClick={() => setStep(3)} className="auth-skip">Skip this step</button>
            </div>
          </>
        )}

        {/* Step 2: Enter Credentials */}
        {step === 2 && selectedIntegration && (
          <>
            <h1 className="auth-title">Connect {selectedIntegration}</h1>
            <p className="auth-subtitle">{available.find((i) => i.id === selectedIntegration)?.oauth
              ? 'You will be redirected to authorize this integration.'
              : 'Enter your API credentials'}</p>

            {connectError && <div className="auth-error">{connectError}</div>}

            {!available.find((i) => i.id === selectedIntegration)?.oauth && (
              <form onSubmit={handleConnect} className="auth-form">
                <label className="auth-label">
                  API Key
                  <input
                    type="text"
                    className="auth-input"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter API key"
                    required
                  />
                </label>
                <label className="auth-label">
                  API Secret (optional)
                  <input
                    type="password"
                    className="auth-input"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Enter API secret"
                  />
                </label>
                <button type="submit" className="auth-button" disabled={connecting}>
                  {connecting ? 'Connecting...' : 'Connect'}
                </button>
              </form>
            )}

            {available.find((i) => i.id === selectedIntegration)?.oauth && (
              <button className="btn btn-primary" onClick={(e) => handleConnect(e)}>
                Begin OAuth flow
              </button>
            )}

            <div className="onboarding-nav">
              <button onClick={() => setStep(1)} className="auth-back">Back</button>
              <button onClick={() => setStep(3)} className="auth-skip">Skip</button>
            </div>
          </>
        )}

        {/* Step 3: Ready */}
        {step === 3 && (
          <>
            <div className="onboarding-success-icon"><CheckCircle size={40} /></div>
            <h1 className="auth-title">You&apos;re all set!</h1>
            <p className="auth-subtitle">
              {selectedIntegration
                ? `${selectedIntegration} is connected. Head to your command center to create your first bot.`
                : 'Head to your command center to get started.'}
            </p>
            <button onClick={handleComplete} className="auth-button">
              Go to Command Center
            </button>
          </>
        )}
      </div>
    </div>
  );
}
