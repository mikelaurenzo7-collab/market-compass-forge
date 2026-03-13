'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Shield, FileCheck, Users, DollarSign, AlertTriangle, ScrollText,
  Check, X,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import AppShell from '../components/AppShell';
import LoadingScreen from '../components/LoadingScreen';

interface AuditEntry {
  id: string;
  action: string;
  botId?: string;
  platform?: string;
  result: string;
  timestamp: string;
}

interface Approval {
  id: string;
  botId: string;
  action: string;
  status: string;
  requestedAt: string;
}

const SAFETY_ICONS = [
  <FileCheck size={14} key={0} />,
  <Users size={14} key={1} />,
  <DollarSign size={14} key={2} />,
  <AlertTriangle size={14} key={3} />,
  <ScrollText size={14} key={4} />,
];

const SAFETY_LAYERS = [
  { num: 1, name: 'Policy Checks', desc: 'Rule-based constraints evaluated before every action', status: 'Active' },
  { num: 2, name: 'Approval Queue', desc: 'High-risk actions require human sign-off', status: 'Active' },
  { num: 3, name: 'Budget Caps', desc: 'Per-action and daily spend limits enforced in real time', status: 'Active' },
  { num: 4, name: 'Circuit Breakers', desc: 'Auto-halt on consecutive errors or error-rate spikes', status: 'Active' },
  { num: 5, name: 'Audit Trail', desc: 'Immutable log of every decision for compliance review', status: 'Active' },
];

function auditBadgeClass(result: string): string {
  if (['allowed', 'success', 'executed', 'approved'].includes(result)) return 'connected';
  if (['pending', 'pending_approval'].includes(result)) return 'pending';
  return 'disconnected';
}

export default function SafetyPage() {
  const { user, loading, apiFetch } = useAuth();
  const router = useRouter();
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [systemAudit, setSystemAudit] = useState<AuditEntry[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [fetching, setFetching] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{ id: string; decision: 'approved' | 'denied'; action: string } | null>(null);

  const fetchSafety = useCallback(async () => {
    try {
      const res = await apiFetch('/api/safety/audit');
      const json = await res.json();
      setAudit(json.data ?? []);
    } catch { /* API may not have this endpoint */ }

    try {
      const res = await apiFetch('/api/audit');
      const json = await res.json();
      if (json.success) setSystemAudit(json.data ?? []);
    } catch {}

    try {
      const res = await apiFetch('/api/safety/approvals');
      const json = await res.json();
      setApprovals(json.data ?? []);
    } catch { /* ignore */ }

    setFetching(false);
  }, [apiFetch]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    fetchSafety();
  }, [user, loading, router, fetchSafety]);

  async function handleApproval(id: string, decision: 'approved' | 'denied') {
    setConfirmAction(null);
    await apiFetch(`/api/safety/approvals/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ approved: decision === 'approved', resolvedBy: user?.email ?? 'user' }),
    });
    fetchSafety();
  }

  function requestApproval(id: string, decision: 'approved' | 'denied', action: string) {
    setConfirmAction({ id, decision, action });
  }

  if (loading || !user) return <LoadingScreen />;

  const pendingApprovals = approvals.filter((a) => a.status === 'pending');

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="page-header-row">
          <div>
            <h1 className="page-title"><Shield size={22} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />Safety Center</h1>
            <p className="page-subtitle">5-layer safety model protecting all autonomous operations</p>
          </div>
        </div>

        {/* Safety Layers */}
        <h2 className="section-title">Safety Layers</h2>
        <div className="safety-layers">
          {SAFETY_LAYERS.map((layer, i) => (
            <motion.div key={layer.num} className="safety-layer" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07, duration: 0.35 }}>
              <div className="safety-layer-number">{SAFETY_ICONS[i]}</div>
              <div style={{ flex: 1 }}>
                <div className="safety-layer-name">{layer.name}</div>
                <div className="safety-layer-desc">{layer.desc}</div>
              </div>
              <span className="connect-badge connected">{layer.status}</span>
            </motion.div>
          ))}
        </div>

        {/* Pending Approvals */}
        <h2 className="section-title">
          Pending Approvals
          {pendingApprovals.length > 0 && (
            <span className="badge trading">{pendingApprovals.length}</span>
          )}
        </h2>
        {pendingApprovals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Check size={28} /></div>
            <div className="empty-state-title">No pending approvals</div>
            <div className="empty-state-desc">All actions within normal parameters.</div>
          </div>
        ) : (
          <table className="data-table" style={{ marginBottom: 'var(--space-2xl)' }}>
            <thead>
              <tr>
                <th>Bot ID</th>
                <th>Action</th>
                <th>Requested</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {pendingApprovals.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{a.botId}</td>
                  <td>{a.action}</td>
                  <td>{new Date(a.requestedAt).toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => requestApproval(a.id, 'approved', a.action)}><Check size={14} /> Approve</button>
                      <button className="btn btn-danger btn-sm" onClick={() => requestApproval(a.id, 'denied', a.action)}><X size={14} /> Deny</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Audit Log */}
        <h2 className="section-title"><ScrollText size={16} style={{ marginRight: 6 }} />Audit Log</h2>
        {fetching && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {[1,2,3].map(i => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-line w-80" />
                <div className="skeleton-line w-40" />
              </div>
            ))}
          </div>
        )}
        {!fetching && audit.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><ScrollText size={28} /></div>
            <div className="empty-state-title">No audit entries yet</div>
            <div className="empty-state-desc">Actions will be logged here as your bots operate.</div>
          </div>
        )}
        {audit.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Bot</th>
                <th>Action</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((entry) => (
                <tr key={entry.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{new Date(entry.timestamp).toLocaleString()}</td>
                  <td>{entry.botId}</td>
                  <td>{entry.action}</td>
                  <td>
                    <span className={`connect-badge ${auditBadgeClass(entry.result)}`}>
                      {entry.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* System audit logs from auth/credentials */}
        {systemAudit.length > 0 && (
          <>
            <h3 className="section-subtitle">System audit</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Platform</th>
                  <th>Action</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {systemAudit.map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{new Date(entry.timestamp).toLocaleString()}</td>
                    <td>{entry.platform}</td>
                    <td>{entry.action}</td>
                    <td>{entry.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </motion.div>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setConfirmAction(null)}
        >
          <div
            style={{
              background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
              borderRadius: '12px', padding: 'var(--space-xl)', maxWidth: '420px', width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 'var(--space-sm)', color: confirmAction.decision === 'denied' ? 'var(--red)' : 'var(--green)' }}>
              {confirmAction.decision === 'approved' ? 'Approve Action?' : 'Deny Action?'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>
              {confirmAction.decision === 'approved'
                ? `This will allow "${confirmAction.action}" to execute. This action may affect real assets.`
                : `This will block "${confirmAction.action}" from executing.`}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button
                className={confirmAction.decision === 'approved' ? 'btn btn-primary' : 'btn btn-danger'}
                onClick={() => handleApproval(confirmAction.id, confirmAction.decision)}
              >
                {confirmAction.decision === 'approved' ? 'Confirm Approve' : 'Confirm Deny'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
