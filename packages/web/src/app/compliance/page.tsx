'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  FileCheck, Shield, Download, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import AppShell from '../components/AppShell';
import LoadingScreen from '../components/LoadingScreen';

/* ─── Types ─── */
interface ComplianceSection {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  score: number;
  findings: string[];
}
interface ComplianceReport {
  id: string;
  tenantId: string;
  standard: 'soc2' | 'gdpr' | 'general';
  generatedAt: number;
  periodStart: number;
  periodEnd: number;
  overallScore: number;
  grade: string;
  sections: ComplianceSection[];
  summary: { totalFindings: number; passes: number; warnings: number; failures: number };
}
interface ReportListItem { id: string; standard: string; generatedAt: number; overallScore: number; grade: string }

/* ─── Helpers ─── */
const STANDARD_LABELS: Record<string, string> = { soc2: 'SOC 2', gdpr: 'GDPR', general: 'General' };
const STANDARD_COLORS: Record<string, string> = { soc2: '#3b82f6', gdpr: '#8b5cf6', general: '#00e87b' };
const STATUS_ICONS: Record<string, typeof CheckCircle> = { pass: CheckCircle, warn: AlertTriangle, fail: XCircle };
const STATUS_COLORS: Record<string, string> = { pass: '#00e87b', warn: '#f59e0b', fail: '#ff3b6b' };

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function scoreColor(score: number) {
  if (score >= 80) return '#00e87b';
  if (score >= 60) return '#f59e0b';
  return '#ff3b6b';
}

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

export default function CompliancePage() {
  const { user, loading, apiFetch } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [activeReport, setActiveReport] = useState<ComplianceReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [fetching, setFetching] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      const res = await apiFetch('/api/compliance/reports');
      const json = await res.json();
      if (json.success) setReports(json.data);
    } catch { /* ignore */ } finally { setFetching(false); }
  }, [apiFetch]);

  const fetchReport = useCallback(async (id: string) => {
    try {
      const res = await apiFetch(`/api/compliance/reports/${id}`);
      const json = await res.json();
      if (json.success) setActiveReport(json.data);
    } catch { /* ignore */ }
  }, [apiFetch]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    fetchReports();
  }, [user, loading, router, fetchReports]);

  async function generate(standard: 'soc2' | 'gdpr' | 'general') {
    setGenerating(true);
    const now = Date.now();
    try {
      const res = await apiFetch('/api/compliance/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ standard, fromMs: now - 30 * 86_400_000, toMs: now }),
      });
      const json = await res.json();
      if (json.success) {
        setActiveReport(json.data);
        fetchReports();
      }
    } catch { /* ignore */ } finally { setGenerating(false); }
  }

  async function downloadCsv(id: string) {
    try {
      const res = await apiFetch(`/api/compliance/reports/${id}/csv`);
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-${id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  }

  if (loading || !user) return <LoadingScreen />;

  return (
    <AppShell>
      <motion.div initial="hidden" animate="show" variants={stagger}>

        {/* Header */}
        <motion.div variants={fade} className="page-header-row">
          <div>
            <h1 className="page-title"><FileCheck size={22} style={{ marginRight: 8, verticalAlign: 'text-bottom', color: 'var(--blue)' }} />Compliance Reports</h1>
            <p className="page-subtitle">SOC 2, GDPR, and regulatory audit reports</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            {(['soc2', 'gdpr', 'general'] as const).map((std) => (
              <button
                key={std}
                className="btn btn-secondary"
                disabled={generating}
                onClick={() => generate(std)}
                style={{ borderColor: STANDARD_COLORS[std] + '40' }}
              >
                {generating ? <RefreshCw size={14} className="spin" /> : <Shield size={14} style={{ color: STANDARD_COLORS[std] }} />}
                <span style={{ marginLeft: 6 }}>{STANDARD_LABELS[std]}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Active Report */}
        {activeReport ? (
          <>
            {/* Top Score Bar */}
            <motion.div variants={fade} className="settings-section" style={{ marginBottom: 'var(--space-xl)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
                  {/* Score Circle */}
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                    border: `3px solid ${scoreColor(activeReport.overallScore)}`,
                    background: `${scoreColor(activeReport.overallScore)}10`,
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: scoreColor(activeReport.overallScore), lineHeight: 1 }}>
                      {activeReport.overallScore}
                    </div>
                    <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>score</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                      <span className="connect-badge connected" style={{ background: STANDARD_COLORS[activeReport.standard] + '20', color: STANDARD_COLORS[activeReport.standard], marginRight: 8 }}>
                        {STANDARD_LABELS[activeReport.standard]}
                      </span>
                      Compliance Report
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      <Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      {formatDate(activeReport.periodStart)} — {formatDate(activeReport.periodEnd)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--green)' }}>{activeReport.summary.passes}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Passes</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--gold)' }}>{activeReport.summary.warnings}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Warnings</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--red)' }}>{activeReport.summary.failures}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Failures</div>
                  </div>
                </div>
                <button className="btn btn-secondary" onClick={() => downloadCsv(activeReport.id)}>
                  <Download size={14} /> <span style={{ marginLeft: 4 }}>CSV</span>
                </button>
              </div>
            </motion.div>

            {/* Sections */}
            <motion.div variants={fade} style={{ display: 'grid', gap: 'var(--space-md)' }}>
              {activeReport.sections.map((section) => {
                const Icon = STATUS_ICONS[section.status] ?? CheckCircle;
                const color = STATUS_COLORS[section.status];
                return (
                  <div key={section.name} className="settings-section" style={{ padding: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: section.findings.length ? 'var(--space-md)' : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <Icon size={18} style={{ color }} />
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{section.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        <span className="connect-badge" style={{ background: `${color}15`, color }}>{section.status.toUpperCase()}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color }}>{section.score}/100</span>
                      </div>
                    </div>
                    {section.findings.length > 0 && (
                      <ul style={{ padding: '0 0 0 var(--space-lg)', listStyle: 'disc', color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.7 }}>
                        {section.findings.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    )}
                  </div>
                );
              })}
            </motion.div>
          </>
        ) : (
          /* Report History or Empty */
          <>
            {fetching ? (
              <motion.div variants={fade} style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-muted)' }}>Loading...</motion.div>
            ) : reports.length === 0 ? (
              <motion.div variants={fade} className="settings-section" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
                <FileCheck size={40} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }} />
                <h3 style={{ marginBottom: 'var(--space-sm)' }}>No Compliance Reports</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-lg)' }}>
                  Generate a report to assess your safety controls, audit trail coverage, and regulatory compliance across all bot families.
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => generate('general')}>General Audit</button>
                  <button className="btn btn-secondary" onClick={() => generate('soc2')}>SOC 2 Report</button>
                  <button className="btn btn-secondary" onClick={() => generate('gdpr')}>GDPR Report</button>
                </div>
              </motion.div>
            ) : (
              <motion.div variants={fade} style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                {reports.map((r) => (
                  <button
                    key={r.id}
                    className="settings-section"
                    onClick={() => fetchReport(r.id)}
                    style={{
                      cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: 'var(--space-md) var(--space-lg)', border: 'none', background: 'var(--bg-card)', width: '100%', textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <span className="connect-badge connected" style={{ background: STANDARD_COLORS[r.standard] + '20', color: STANDARD_COLORS[r.standard] }}>
                        {STANDARD_LABELS[r.standard] ?? r.standard}
                      </span>
                      <span style={{ fontWeight: 600 }}>Score: {r.overallScore}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Grade {r.grade}</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(r.generatedAt)}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </>
        )}

      </motion.div>
    </AppShell>
  );
}
