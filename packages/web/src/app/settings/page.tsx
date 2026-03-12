'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Settings, User, Shield, AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import AppShell from '../components/AppShell';

export default function SettingsPage() {
  const { user, loading, tenantId, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
  }, [user, loading, router]);

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  if (loading || !user) return null;

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
