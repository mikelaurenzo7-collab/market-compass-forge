'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Settings, User, Shield, AlertTriangle, LogOut, Bell, KeyRound, BellRing, Network } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import AppShell from '../components/AppShell';
import LoadingScreen from '../components/LoadingScreen';

interface NotificationPrefs {
  emailTradeAlerts: boolean;
  emailDailyDigest: boolean;
  emailSecurityAlerts: boolean;
  emailWeeklyReport: boolean;
  tradeAlertMinConfidence: number;
  tradeAlertMinPnlUsd: number;
}

const DEFAULT_PREFS: NotificationPrefs = {
  emailTradeAlerts: true,
  emailDailyDigest: true,
  emailSecurityAlerts: true,
  emailWeeklyReport: false,
  tradeAlertMinConfidence: 80,
  tradeAlertMinPnlUsd: 10,
};

export default function SettingsPage() {
  const { user, loading, tenantId, apiFetch, logout } = useAuth();
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaSetupData, setMfaSetupData] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaBackupCodes, setMfaBackupCodes] = useState<string[] | null>(null);
  const [mfaError, setMfaError] = useState('');
  const [mfaWorking, setMfaWorking] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushWorking, setPushWorking] = useState(false);
  const [federatedEnabled, setFederatedEnabled] = useState(false);
  const [federatedLoading, setFederatedLoading] = useState(true);
  const [federatedWorking, setFederatedWorking] = useState(false);

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await apiFetch('/api/notifications/preferences');
      const json = await res.json();
      if (json.success) setPrefs({ ...DEFAULT_PREFS, ...json.data });
    } catch { /* ignore */ } finally {
      setPrefsLoading(false);
    }
  }, [apiFetch]);

  const fetchMfaStatus = useCallback(async () => {
    try {
      const res = await apiFetch('/api/auth/mfa/status');
      const json = await res.json();
      if (json.success) setMfaEnabled(json.data.mfaEnabled);
    } catch { /* ignore */ } finally {
      setMfaLoading(false);
    }
  }, [apiFetch]);

  const fetchFederatedStatus = useCallback(async () => {
    try {
      const res = await apiFetch('/api/federated/status');
      const json = await res.json();
      if (json.success) setFederatedEnabled(json.data.enabled);
    } catch { /* ignore */ } finally {
      setFederatedLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    fetchPrefs();
    fetchMfaStatus();
    fetchFederatedStatus();
    // Check push notification support
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      setPushSupported(true);
      setPushSubscribed(Notification.permission === 'granted');
    }
  }, [user, loading, router, fetchPrefs, fetchMfaStatus, fetchFederatedStatus]);

  async function savePrefs(updated: NotificationPrefs) {
    setPrefs(updated);
    setPrefsSaving(true);
    try {
      await apiFetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch { /* ignore */ } finally {
      setPrefsSaving(false);
    }
  }

  function togglePref(key: keyof NotificationPrefs) {
    const updated = { ...prefs, [key]: !prefs[key] };
    savePrefs(updated);
  }

  async function handleMfaSetup() {
    setMfaError('');
    setMfaWorking(true);
    try {
      const res = await apiFetch('/api/auth/mfa/setup', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setMfaSetupData(json.data);
      } else {
        setMfaError(json.error || 'Failed to start MFA setup');
      }
    } catch { setMfaError('Network error'); } finally { setMfaWorking(false); }
  }

  async function handleMfaVerifySetup() {
    if (mfaCode.length !== 6) { setMfaError('Enter a 6-digit code'); return; }
    setMfaError('');
    setMfaWorking(true);
    try {
      const res = await apiFetch('/api/auth/mfa/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mfaCode }),
      });
      const json = await res.json();
      if (json.success) {
        setMfaEnabled(true);
        setMfaBackupCodes(json.data.backupCodes);
        setMfaSetupData(null);
        setMfaCode('');
      } else {
        setMfaError(json.error || 'Invalid code');
      }
    } catch { setMfaError('Network error'); } finally { setMfaWorking(false); }
  }

  async function handleMfaDisable() {
    if (mfaCode.length !== 6) { setMfaError('Enter your authenticator code to disable MFA'); return; }
    setMfaError('');
    setMfaWorking(true);
    try {
      const res = await apiFetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mfaCode }),
      });
      const json = await res.json();
      if (json.success) {
        setMfaEnabled(false);
        setMfaCode('');
        setMfaBackupCodes(null);
      } else {
        setMfaError(json.error || 'Failed to disable MFA');
      }
    } catch { setMfaError('Network error'); } finally { setMfaWorking(false); }
  }

  async function handlePushToggle() {
    setPushWorking(true);
    try {
      if (!pushSubscribed) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setPushSubscribed(true);
        }
      }
    } catch { /* ignore */ } finally {
      setPushWorking(false);
    }
  }

  async function handleFederatedToggle() {
    setFederatedWorking(true);
    try {
      const res = await apiFetch('/api/federated/opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !federatedEnabled }),
      });
      const json = await res.json();
      if (json.success) setFederatedEnabled(!federatedEnabled);
    } catch { /* ignore */ } finally {
      setFederatedWorking(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  if (loading || !user) return <LoadingScreen />;

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="page-header-row">
        <div>
          <h1 className="page-title"><Settings size={22} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />Settings</h1>
          <p className="page-subtitle">Account and workspace configuration</p>
        </div>
      </div>

      {/* Account */}
      <div className="settings-section">
        <div className="settings-section-title"><User size={16} style={{ marginRight: 6 }} />Account</div>
        <div className="settings-row">
          <span className="settings-label">Name</span>
          <span className="settings-value">{user.displayName}</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">Email</span>
          <span className="settings-value">{user.email}</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">Tenant ID</span>
          <span className="settings-value">{tenantId}</span>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="settings-section">
        <div className="settings-section-title"><KeyRound size={16} style={{ marginRight: 6 }} />Two-Factor Authentication</div>
        {mfaLoading ? (
          <div style={{ padding: 'var(--space-md)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading...</div>
        ) : mfaBackupCodes ? (
          <div style={{ padding: 'var(--space-md)' }}>
            <p style={{ color: 'var(--green)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>✓ MFA enabled successfully!</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-sm)' }}>Save these backup codes — they won&apos;t be shown again:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', maxWidth: '320px' }}>
              {mfaBackupCodes.map((code, i) => (
                <code key={i} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', fontSize: '0.8rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{code}</code>
              ))}
            </div>
            <button className="btn btn-secondary" style={{ marginTop: 'var(--space-md)', fontSize: '0.8rem' }} onClick={() => setMfaBackupCodes(null)}>I&apos;ve saved them</button>
          </div>
        ) : mfaSetupData ? (
          <div style={{ padding: 'var(--space-md)' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-sm)' }}>
              Scan in your authenticator app or enter the key manually:
            </p>
            <code style={{ display: 'block', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--green)', marginBottom: 'var(--space-md)', wordBreak: 'break-all' }}>
              {mfaSetupData.secret}
            </code>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit code"
                value={mfaCode}
                onChange={e => { setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setMfaError(''); }}
                style={{ width: '120px', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.9rem', textAlign: 'center', letterSpacing: '4px' }}
              />
              <button className="btn btn-primary" disabled={mfaWorking || mfaCode.length !== 6} onClick={handleMfaVerifySetup} style={{ fontSize: '0.8rem' }}>
                {mfaWorking ? 'Verifying...' : 'Verify & Enable'}
              </button>
              <button className="btn btn-secondary" onClick={() => { setMfaSetupData(null); setMfaCode(''); setMfaError(''); }} style={{ fontSize: '0.8rem' }}>Cancel</button>
            </div>
            {mfaError && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: 'var(--space-xs)' }}>{mfaError}</p>}
          </div>
        ) : mfaEnabled ? (
          <div style={{ padding: 'var(--space-md)' }}>
            <div className="settings-row">
              <div>
                <span className="settings-label">TOTP Authenticator</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Your account is protected with two-factor authentication</p>
              </div>
              <span className="connect-badge connected">Enabled</span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', marginTop: 'var(--space-sm)', flexWrap: 'wrap' }}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Code to disable"
                value={mfaCode}
                onChange={e => { setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setMfaError(''); }}
                style={{ width: '120px', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.9rem', textAlign: 'center', letterSpacing: '4px' }}
              />
              <button className="btn btn-danger" disabled={mfaWorking} onClick={handleMfaDisable} style={{ fontSize: '0.8rem' }}>Disable MFA</button>
            </div>
            {mfaError && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: 'var(--space-xs)' }}>{mfaError}</p>}
          </div>
        ) : (
          <div style={{ padding: 'var(--space-md)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-sm)' }}>
              Add an extra layer of security using a TOTP authenticator app.
            </p>
            <button className="btn btn-primary" disabled={mfaWorking} onClick={handleMfaSetup} style={{ fontSize: '0.8rem' }}>
              {mfaWorking ? 'Setting up...' : 'Enable MFA'}
            </button>
            {mfaError && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: 'var(--space-xs)' }}>{mfaError}</p>}
          </div>
        )}
      </div>

      {/* Safety Defaults */}
      <div className="settings-section">
        <div className="settings-section-title"><Shield size={16} style={{ marginRight: 6 }} />Safety Defaults</div>
        <div className="settings-row">
          <span className="settings-label">Policy Checks</span>
          <span className="connect-badge connected">Enabled</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">Approval Queue</span>
          <span className="connect-badge connected">Enabled</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">Budget Caps</span>
          <span className="connect-badge connected">Enabled</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">Circuit Breakers</span>
          <span className="connect-badge connected">Enabled</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">Audit Trail</span>
          <span className="connect-badge connected">Enabled</span>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="settings-section">
        <div className="settings-section-title"><Bell size={16} style={{ marginRight: 6 }} />Notifications {prefsSaving && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>(saving...)</span>}</div>
        {prefsLoading ? (
          <div style={{ padding: 'var(--space-md)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading preferences...</div>
        ) : (
          <>
            <div className="notification-toggle">
              <div>
                <div className="notification-toggle-label">Trade Alerts</div>
                <div className="notification-toggle-desc">Get emailed when a bot executes a trade</div>
              </div>
              <div className={`toggle-switch ${prefs.emailTradeAlerts ? 'active' : ''}`} role="switch" aria-checked={prefs.emailTradeAlerts} tabIndex={0} onClick={() => togglePref('emailTradeAlerts')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePref('emailTradeAlerts'); }}} />
            </div>
            <div className="notification-toggle">
              <div>
                <div className="notification-toggle-label">Daily Digest</div>
                <div className="notification-toggle-desc">Morning summary of all bot activity and P&L</div>
              </div>
              <div className={`toggle-switch ${prefs.emailDailyDigest ? 'active' : ''}`} role="switch" aria-checked={prefs.emailDailyDigest} tabIndex={0} onClick={() => togglePref('emailDailyDigest')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePref('emailDailyDigest'); }}} />
            </div>
            <div className="notification-toggle">
              <div>
                <div className="notification-toggle-label">Security Alerts</div>
                <div className="notification-toggle-desc">Login notifications, API key changes, and safety events</div>
              </div>
              <div className={`toggle-switch ${prefs.emailSecurityAlerts ? 'active' : ''}`} role="switch" aria-checked={prefs.emailSecurityAlerts} tabIndex={0} onClick={() => togglePref('emailSecurityAlerts')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePref('emailSecurityAlerts'); }}} />
            </div>
            <div className="notification-toggle">
              <div>
                <div className="notification-toggle-label">Weekly Report</div>
                <div className="notification-toggle-desc">Weekly performance summary across all bots</div>
              </div>
              <div className={`toggle-switch ${prefs.emailWeeklyReport ? 'active' : ''}`} role="switch" aria-checked={prefs.emailWeeklyReport} tabIndex={0} onClick={() => togglePref('emailWeeklyReport')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePref('emailWeeklyReport'); }}} />
            </div>
          </>
        )}
      </div>

      {/* Push Notifications */}
      <div className="settings-section">
        <div className="settings-section-title"><BellRing size={16} style={{ marginRight: 6 }} />Push Notifications</div>
        {!pushSupported ? (
          <div style={{ padding: 'var(--space-md)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Push notifications are not supported in this browser.
          </div>
        ) : (
          <div style={{ padding: 'var(--space-md)' }}>
            <div className="settings-row">
              <div>
                <span className="settings-label">Browser Push</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Receive real-time alerts for trades, approvals, and circuit breakers
                </p>
              </div>
              {pushSubscribed ? (
                <span className="connect-badge connected">Enabled</span>
              ) : (
                <button className="btn btn-primary" disabled={pushWorking} onClick={handlePushToggle} style={{ fontSize: '0.8rem' }}>
                  {pushWorking ? 'Enabling...' : 'Enable Push'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Federated Learning */}
      <div className="settings-section">
        <div className="settings-section-title"><Network size={16} style={{ marginRight: 6 }} />Federated Learning</div>
        {federatedLoading ? (
          <div style={{ padding: 'var(--space-md)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading...</div>
        ) : (
          <div style={{ padding: 'var(--space-md)' }}>
            <div className="notification-toggle">
              <div>
                <div className="notification-toggle-label">Contribute anonymized performance data</div>
                <div className="notification-toggle-desc">
                  Help improve strategy recommendations across the BeastBots network.
                  Your data is aggregated and never shared individually.
                </div>
              </div>
              <div
                className={`toggle-switch ${federatedEnabled ? 'active' : ''}`}
                role="switch"
                aria-checked={federatedEnabled}
                tabIndex={0}
                onClick={federatedWorking ? undefined : handleFederatedToggle}
                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !federatedWorking) { e.preventDefault(); handleFederatedToggle(); }}}
              />
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="settings-section" style={{ borderColor: 'var(--red)' }}>
        <div className="settings-section-title" style={{ color: 'var(--red)' }}><AlertTriangle size={16} style={{ marginRight: 6 }} />Danger Zone</div>
        <div className="settings-row">
          <div>
            <span className="settings-label">Sign Out</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              End your current session
            </p>
          </div>
          <button className="btn btn-danger" onClick={handleLogout}><LogOut size={14} style={{ marginRight: 4 }} />Sign Out</button>
        </div>
      </div>
      </motion.div>
    </AppShell>
  );
}
