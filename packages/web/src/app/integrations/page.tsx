'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  TrendingUp, ShoppingCart, Share2, Wrench, MessageSquare,
  ClipboardList, Handshake, Plug, Unplug, Bot,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import AppShell from '../components/AppShell';

interface IntegrationInfo {
  id: string;
  displayName: string;
  category: string;
  oauth: boolean;
  status: string;
}

// Bot platform categories — these power your bots directly
const BOT_PLATFORM_CATEGORIES = ['trading', 'ecommerce', 'social'];
// Workforce tool categories — enhance your team's workflow
const WORKFORCE_TOOL_CATEGORIES = ['workforce', 'communication', 'project_management', 'crm'];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  trading: <TrendingUp size={18} />,
  ecommerce: <ShoppingCart size={18} />,
  social: <Share2 size={18} />,
  workforce: <Wrench size={18} />,
  communication: <MessageSquare size={18} />,
  project_management: <ClipboardList size={18} />,
  crm: <Handshake size={18} />,
};

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; desc: string; color: string }> = {
  trading: { label: 'Trading Platforms', icon: CATEGORY_ICONS.trading, desc: 'Exchanges & brokers your trading bots execute on', color: 'var(--color-trading)' },
  ecommerce: { label: 'E-Commerce', icon: CATEGORY_ICONS.ecommerce, desc: 'Storefronts & marketplaces your store bots manage', color: 'var(--color-store)' },
  social: { label: 'Social Media', icon: CATEGORY_ICONS.social, desc: 'Social channels your content bots operate on', color: 'var(--color-social)' },
  workforce: { label: 'Workforce Tools', icon: CATEGORY_ICONS.workforce, desc: 'Internal automation & operations tools', color: 'var(--color-workforce)' },
  communication: { label: 'Communication', icon: CATEGORY_ICONS.communication, desc: 'Messaging & notification channels', color: 'var(--accent-blue)' },
  project_management: { label: 'Project Management', icon: CATEGORY_ICONS.project_management, desc: 'Task tracking & project workflows', color: 'var(--accent-purple)' },
  crm: { label: 'CRM & Sales', icon: CATEGORY_ICONS.crm, desc: 'Customer relationship & pipeline tools', color: 'var(--accent-gold)' },
};

export default function IntegrationsPage() {
  return (
    <Suspense>
      <IntegrationsPageContent />
    </Suspense>
  );
}

interface ConnectedCredential {
  id: string;
  platform: string;
  accountLabel: string;
  status: string;
}

function IntegrationsPageContent() {
  const { user, loading, apiFetch } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [integrations, setIntegrations] = useState<IntegrationInfo[]>([]);
  const [connectedCreds, setConnectedCreds] = useState<ConnectedCredential[]>([]);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<'platforms' | 'tools'>('platforms');
  const [modal, setModal] = useState<IntegrationInfo | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [accountLabel, setAccountLabel] = useState('');
  const [connectError, setConnectError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [notification, setNotification] = useState('');

  const connected = connectedCreds.map(c => c.platform);

  const fetchCredentials = useCallback(async () => {
    try {
      const res = await apiFetch('/api/credentials');
      const json = await res.json();
      setConnectedCreds(json.data ?? []);
    } catch { /* ignore */ }
    setFetching(false);
  }, [apiFetch]);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await apiFetch('/api/integrations');
      const json = await res.json();
      if (json.success) {
        setIntegrations(json.data);
      }
    } catch {}
  }, [apiFetch]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    fetchCredentials();
    fetchIntegrations();
  }, [user, loading, router, fetchCredentials, fetchIntegrations]);

  useEffect(() => {
    const conn = searchParams.get('connected');
    if (conn) {
      setNotification(`✓ Successfully connected ${conn}`);
      fetchCredentials();
    }
    const tab = searchParams.get('tab');
    if (tab === 'tools') setActiveTab('tools');
  }, [searchParams, fetchCredentials]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!modal) return;
    if (modal.oauth) {
      await handleOAuthConnect(modal.id);
      return;
    }
    setConnectError('');
    setConnecting(true);
    try {
      const res = await apiFetch(`/api/credentials/${modal.id}`, {
        method: 'POST',
        body: JSON.stringify({ apiKey, apiSecret: apiSecret || undefined, accountLabel: accountLabel.trim() || undefined }),
      });
      const json = await res.json();
      if (!json.success) {
        setConnectError(json.error ?? 'Failed');
        setConnecting(false);
        return;
      }
      setModal(null);
      setApiKey('');
      setApiSecret('');
      setAccountLabel('');
      setConnecting(false);
      fetchCredentials();
    } catch {
      setConnectError('Network error');
      setConnecting(false);
    }
  }

  async function handleDisconnect(platformId: string, label?: string) {
    if (!confirm(`Disconnect ${platformId}${label && label !== 'default' ? ` (${label})` : ''}?`)) return;
    const queryStr = label ? `?label=${encodeURIComponent(label)}` : '';
    await apiFetch(`/api/credentials/${platformId}${queryStr}`, { method: 'DELETE' });
    fetchCredentials();
  }

  async function handleOAuthConnect(platformId: string) {
    setNotification('');
    try {
      const res = await apiFetch(`/api/integrations/${platformId}/connect`, {
        headers: { Accept: 'application/json' },
      });
      const json = await res.json();
      if (json.success && json.url) {
        window.location.href = json.url;
      }
    } catch {
      setNotification('Failed to initiate connection. Please try again.');
    }
  }

  if (loading || !user) return null;

  const platformIntegrations = integrations.filter((p) => BOT_PLATFORM_CATEGORIES.includes(p.category));
  const toolIntegrations = integrations.filter((p) => WORKFORCE_TOOL_CATEGORIES.includes(p.category));

  const platformConnectedIds = [...new Set(connected.filter((id) =>
    platformIntegrations.some((p) => p.id === id)
  ))];
  const toolConnectedIds = [...new Set(connected.filter((id) =>
    toolIntegrations.some((p) => p.id === id)
  ))];
  // backwards-compat aliases for tab badge counts
  const platformConnected = platformConnectedIds;
  const toolConnected = toolConnectedIds;

  const activeCategoryList = activeTab === 'platforms' ? BOT_PLATFORM_CATEGORIES : WORKFORCE_TOOL_CATEGORIES;
  const activeIntegrations = activeTab === 'platforms' ? platformIntegrations : toolIntegrations;

  function renderIntegrationCard(p: IntegrationInfo) {
    const platformCreds = connectedCreds.filter(c => c.platform === p.id);
    const isConnected = platformCreds.length > 0;

    function openConnectModal() {
      setModal(p);
      setConnectError('');
      setApiKey('');
      setApiSecret('');
      setAccountLabel('');
    }

    return (
      <div key={p.id} className="connect-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="connect-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <span className="connect-name">{p.displayName}</span>
              {p.status !== 'ga' && (
                <span style={{
                  fontSize: '0.65rem',
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: p.status === 'beta' ? 'var(--blue-dim)' : 'var(--surface-secondary)',
                  color: p.status === 'beta' ? 'var(--blue)' : 'var(--text-muted)',
                  fontWeight: 600,
                }}>
                  {p.status}
                </span>
              )}
            </div>
          </div>
          <div className="connect-status">
            <span className={`connect-badge ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? `${platformCreds.length} account${platformCreds.length !== 1 ? 's' : ''}` : 'Not connected'}
            </span>
            {p.oauth ? (
              <button className="btn btn-primary btn-sm" onClick={() => handleOAuthConnect(p.id)}>
                <Plug size={14} /> {isConnected ? 'Add Account' : 'Connect'}
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={openConnectModal}>
                <Plug size={14} /> {isConnected ? 'Add Account' : 'Connect'}
              </button>
            )}
          </div>
        </div>

        {/* Show connected accounts */}
        {platformCreds.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', marginTop: 'var(--space-sm)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border-subtle)' }}>
            {platformCreds.map(cred => (
              <div key={cred.id} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-xs)',
                background: 'var(--surface-secondary)', borderRadius: 'var(--radius-sm)',
                padding: '4px 10px', fontSize: '0.78rem',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-primary)' }}>
                  {cred.accountLabel === 'default' ? 'Default' : cred.accountLabel}
                </span>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex' }}
                  onClick={() => handleDisconnect(p.id, cred.accountLabel)}
                  title={`Disconnect ${cred.accountLabel}`}
                >
                  <Unplug size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <AppShell>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Integrations</h1>
          <p className="page-subtitle">
            {new Set(connected).size} platform{new Set(connected).size !== 1 ? 's' : ''} connected
            {connectedCreds.length > new Set(connected).size ? ` (${connectedCreds.length} accounts)` : ''}
          </p>
        </div>
      </div>

      {notification && <div className="auth-info">{notification}</div>}

      {/* Main tab switcher */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'platforms' ? 'active' : ''}`}
          onClick={() => setActiveTab('platforms')}
        >
          <Bot size={16} />
          <span>Bot Platforms</span>
          {!fetching && platformConnected.length > 0 && (
            <span style={{ background: 'var(--green-dim)', color: 'var(--green)', borderRadius: 999, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
              {platformConnected.length}
            </span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
          onClick={() => setActiveTab('tools')}
        >
          <Wrench size={16} />
          <span>Workforce Tools</span>
          {!fetching && toolConnected.length > 0 && (
            <span style={{ background: 'var(--gold-dim)', color: 'var(--gold)', borderRadius: 999, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
              {toolConnected.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab description */}
      {activeTab === 'platforms' ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md) var(--space-lg)', marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <Bot size={24} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Bot Operation Platforms</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              These are the exchanges, storefronts, and social channels your bots operate on directly. Connect them to unlock bot creation for each platform.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md) var(--space-lg)', marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <Wrench size={24} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Workforce & Automation Tools</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              Connect your team tools to let workforce bots automate Slack messages, Notion pages, Jira tickets, Salesforce records, and more.
            </div>
          </div>
        </div>
      )}

      {fetching && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="skeleton-card" style={{ padding: 'var(--space-lg)' }}>
              <div className="skeleton-line w-60" />
            </div>
          ))}
        </div>
      )}

      {!fetching && (
        <div className="integrations-tab-panel">
          {activeCategoryList.map((cat) => {
            const catItems = activeIntegrations.filter((p) => p.category === cat);
            if (catItems.length === 0) return null;
            const meta = CATEGORY_META[cat];
            const connectedInCat = new Set(catItems.filter((p) => connected.includes(p.id)).map(p => p.id)).size;
            return (
              <div key={cat} className="platform-category-block">
                {/* Category header */}
                <div className="integration-section-header">
                  <div className="integration-section-icon" style={{ background: `${meta?.color}18` }}>
                    {CATEGORY_ICONS[cat] ?? <Plug size={18} />}
                  </div>
                  <div>
                    <div className="integration-section-title" style={{ color: meta?.color }}>
                      {meta?.label ?? cat}
                    </div>
                    <div className="integration-section-desc">{meta?.desc}</div>
                  </div>
                  <span
                    className="integration-section-count"
                    style={{
                      background: connectedInCat > 0 ? 'var(--green-dim)' : 'var(--surface-secondary)',
                      color: connectedInCat > 0 ? 'var(--green)' : 'var(--text-muted)',
                    }}
                  >
                    {connectedInCat}/{catItems.length} connected
                  </span>
                </div>

                {/* Integration cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {catItems.map(renderIntegrationCard)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* API Key Connect Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Connect {modal.displayName}</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
              Enter your API credentials for {modal.displayName}. Your keys are encrypted at rest.
            </p>

            {connectError && <div className="auth-error" style={{ marginBottom: 'var(--space-md)' }}>{connectError}</div>}

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
                  autoFocus
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
              <label className="auth-label">
                Account Label (optional)
                <input
                  type="text"
                  className="auth-input"
                  value={accountLabel}
                  onChange={(e) => setAccountLabel(e.target.value)}
                  placeholder='e.g. "Main Store", "Outlet"'
                  maxLength={100}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  Label to distinguish multiple accounts on the same platform
                </span>
              </label>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={connecting}>
                  {connecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

