'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import AppShell from '../components/AppShell';

interface IntegrationInfo {
  id: string;
  displayName: string;
  category: string;
  oauth: boolean;
  status: string;
}

// we'll fetch official list from the API instead of staticizing it


export default function IntegrationsPage() {
  const { user, loading, apiFetch } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [integrations, setIntegrations] = useState<IntegrationInfo[]>([]);
  const [connected, setConnected] = useState<string[]>([]);
  const [fetching, setFetching] = useState(true);
  const [modal, setModal] = useState<IntegrationInfo | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [connectError, setConnectError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [notification, setNotification] = useState('');

  const fetchCredentials = useCallback(async () => {
    try {
      const res = await apiFetch('/api/credentials');
      const json = await res.json();
      setConnected((json.data ?? []).map((c: any) => c.platform));
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
      setNotification(`Connected to ${conn}`);
      fetchCredentials();
    }
  }, [searchParams, fetchCredentials]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!modal) return;
    // if oauth provider we trigger redirect instead of form
    if (modal.oauth) {
      window.location.href = `/api/integrations/${modal.id}/connect`;
      return;
    }

    setConnectError('');
    setConnecting(true);

    try {
      const res = await apiFetch(`/api/credentials/${modal.id}`, {
        method: 'POST',
        body: JSON.stringify({ apiKey, apiSecret: apiSecret || undefined }),
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
      setConnecting(false);
      fetchCredentials();
    } catch {
      setConnectError('Network error');
      setConnecting(false);
    }
  }

  async function handleDisconnect(platformId: string) {
    if (!confirm(`Disconnect ${platformId}?`)) return;
    await apiFetch(`/api/credentials/${platformId}`, { method: 'DELETE' });
    fetchCredentials();
  }

  if (loading || !user) return null;

  const categories = [...new Set(integrations.map((p) => p.category))] as string[]; // derive from server list


  return (
    <AppShell>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Integrations</h1>
          <p className="page-subtitle">{connected.length} platform{connected.length !== 1 ? 's' : ''} connected</p>
        </div>
      </div>

      {notification && <div className="auth-info">{notification}</div>}
      {fetching && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-line w-60" />
              <div className="skeleton-line w-40" />
            </div>
          ))}
        </div>
      )}

      {!fetching && categories.map((cat) => (
        <div key={cat}>
          <h2 className="section-title">{cat}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-2xl)' }}>
            {integrations.filter((p) => p.category === cat).map((p) => {
              const isConnected = connected.includes(p.id);
              return (
                <div key={p.id} className="connect-card">
                  <div className="connect-info">
                    <span className="connect-name">{p.displayName}</span>
                    {/* could show status or description here */}
                  </div>
                  <div className="connect-status">
                    <span className={`connect-badge ${isConnected ? 'connected' : 'disconnected'}`}>
                      {isConnected ? 'Connected' : 'Not connected'}
                    </span>
                    {isConnected ? (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDisconnect(p.id)}>
                        Disconnect
                      </button>
                    ) : p.oauth ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={async () => {
                          setNotification('');
                          const res = await apiFetch(`/api/integrations/${p.id}/connect`);
                          if (res.redirected) {
                            window.location.href = res.url;
                          }
                        }}
                      >
                        Connect
                      </button>
                    ) : (
                      <button className="btn btn-primary btn-sm" onClick={() => { setModal(p); setConnectError(''); setApiKey(''); setApiSecret(''); }}>
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Connect Modal */}
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
