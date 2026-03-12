'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  TrendingUp, ShoppingCart, Share2, Users, Zap, Clock, Shield,
  ChevronRight, Filter, Sparkles,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import AppShell from '../components/AppShell';
import LoadingScreen from '../components/LoadingScreen';

interface BotTemplate {
  id: string;
  name: string;
  family: string;
  platforms: string[];
  strategy: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  riskLevel: 'low' | 'medium' | 'high';
  estimatedSetupMinutes: number;
  tags: string[];
  config: Record<string, unknown>;
  longDescription: string;
  defaultPaperMode: boolean;
}

const FAMILY_ICONS: Record<string, React.ReactNode> = {
  trading: <TrendingUp size={18} />,
  store: <ShoppingCart size={18} />,
  social: <Share2 size={18} />,
  workforce: <Users size={18} />,
};

const FAMILY_COLORS: Record<string, string> = {
  trading: 'var(--color-trading)',
  store: 'var(--color-store)',
  social: 'var(--color-social)',
  workforce: 'var(--color-workforce)',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#10b981',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
};

const RISK_COLORS: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
};

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

export default function TemplatesPage() {
  const { user, loading, apiFetch } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<BotTemplate[]>([]);
  const [fetching, setFetching] = useState(true);
  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<BotTemplate | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState('');
  const [loadError, setLoadError] = useState('');

  const fetchTemplates = useCallback(async () => {
    setLoadError('');
    try {
      const params = new URLSearchParams();
      if (familyFilter !== 'all') params.set('family', familyFilter);
      if (difficultyFilter !== 'all') params.set('difficulty', difficultyFilter);
      const res = await apiFetch(`/api/templates?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTemplates(json.data);
      } else {
        setLoadError(json.error ?? 'Failed to load templates');
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setLoadError('Failed to load templates. Please try again.');
    } finally {
      setFetching(false);
    }
  }, [apiFetch, familyFilter, difficultyFilter]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    fetchTemplates();
  }, [user, loading, router, fetchTemplates]);

  async function deployTemplate(template: BotTemplate) {
    setDeploying(true);
    setDeployError('');
    try {
      const botConfig = {
        name: template.name,
        family: template.family,
        platform: template.platforms[0],
        config: {
          ...template.config,
          paperTrading: template.defaultPaperMode,
        },
      };
      const res = await apiFetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(botConfig),
      });
      const json = await res.json();
      if (json.error) {
        setDeployError(json.error);
        return;
      }
      const botId = json.data?.id ?? json.id;
      router.push(`/bots/${botId}`);
    } catch (err) {
      console.error('Failed to deploy template:', err);
      setDeployError('Failed to deploy template');
    } finally {
      setDeploying(false);
    }
  }

  if (loading || !user) return <LoadingScreen />;

  return (
    <AppShell>
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <Sparkles size={24} style={{ color: 'var(--color-primary)' }} />
            Bot Templates
          </h1>
          <p className="page-subtitle">Pre-configured strategies. Deploy in under 60 seconds.</p>
        </div>
        <Link href="/bots/create" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          Custom Bot <ChevronRight size={14} />
        </Link>
      </div>

      {/* Filters */}
      <div className="template-filters">
        <div className="template-filter-group">
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          <button
            className={`template-filter-btn ${familyFilter === 'all' ? 'active' : ''}`}
            onClick={() => setFamilyFilter('all')}
          >All</button>
          {['trading', 'store', 'social', 'workforce'].map(f => (
            <button
              key={f}
              className={`template-filter-btn ${familyFilter === f ? 'active' : ''}`}
              onClick={() => setFamilyFilter(f)}
              style={familyFilter === f ? { borderColor: FAMILY_COLORS[f], color: FAMILY_COLORS[f] } : {}}
            >
              {FAMILY_ICONS[f]} {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="template-filter-group">
          {['all', 'beginner', 'intermediate', 'advanced'].map(d => (
            <button
              key={d}
              className={`template-filter-btn ${difficultyFilter === d ? 'active' : ''}`}
              onClick={() => setDifficultyFilter(d)}
            >
              {d === 'all' ? 'Any Level' : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="auth-error" style={{ marginBottom: 'var(--space-lg)' }}>
          {loadError}
        </div>
      )}

      {/* Template Grid */}
      {fetching ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-line w-40" />
              <div className="skeleton-line w-80" />
              <div className="skeleton-line w-60" />
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          className="template-grid"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {templates.map(template => (
            <motion.div
              key={template.id}
              className="template-card"
              variants={fade}
              onClick={() => setSelectedTemplate(template)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedTemplate(template); }}}
              role="button"
              tabIndex={0}
              style={{ cursor: 'pointer' }}
            >
              <div className="template-card-header">
                <span className="template-card-icon" style={{ color: FAMILY_COLORS[template.family] }}>
                  {FAMILY_ICONS[template.family]}
                </span>
                <div className="template-card-badges">
                  <span className="template-badge" style={{ color: DIFFICULTY_COLORS[template.difficulty] }}>
                    {template.difficulty}
                  </span>
                  <span className="template-badge" style={{ color: RISK_COLORS[template.riskLevel] }}>
                    <Shield size={10} /> {template.riskLevel} risk
                  </span>
                </div>
              </div>
              <h3 className="template-card-title">{template.name}</h3>
              <p className="template-card-desc">{template.description}</p>
              <div className="template-card-meta">
                <span className="template-meta-item">
                  <Clock size={12} /> {template.estimatedSetupMinutes} min setup
                </span>
                <span className="template-meta-item">
                  <Zap size={12} /> {template.platforms.length} platform{template.platforms.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="template-card-tags">
                {template.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="template-tag">{tag}</span>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {templates.length === 0 && !fetching && (
        <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-muted)' }}>
          No templates match your filters.
        </div>
      )}

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <div className="template-modal-overlay" onClick={() => setSelectedTemplate(null)}>
          <motion.div
            className="template-modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="template-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <span style={{ color: FAMILY_COLORS[selectedTemplate.family] }}>
                  {FAMILY_ICONS[selectedTemplate.family]}
                </span>
                <h2 className="template-modal-title">{selectedTemplate.name}</h2>
              </div>
              <button className="template-modal-close" onClick={() => setSelectedTemplate(null)}>×</button>
            </div>

            <div className="template-modal-body">
              <div className="template-modal-badges">
                <span className="template-badge" style={{ color: DIFFICULTY_COLORS[selectedTemplate.difficulty] }}>
                  {selectedTemplate.difficulty}
                </span>
                <span className="template-badge" style={{ color: RISK_COLORS[selectedTemplate.riskLevel] }}>
                  <Shield size={10} /> {selectedTemplate.riskLevel} risk
                </span>
                <span className="template-badge">
                  <Clock size={10} /> {selectedTemplate.estimatedSetupMinutes} min setup
                </span>
                {selectedTemplate.defaultPaperMode && (
                  <span className="template-badge" style={{ color: '#10b981' }}>
                    Paper mode default
                  </span>
                )}
              </div>

              <div className="template-modal-platforms">
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Supported platforms:</span>
                <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                  {selectedTemplate.platforms.map(p => (
                    <span key={p} className="strategy-tag">{p}</span>
                  ))}
                </div>
              </div>

              <div className="template-modal-description">
                {selectedTemplate.longDescription.split('\n\n').map((paragraph, pi) => (
                  <p key={pi} style={{ marginBottom: 'var(--space-sm)' }}>
                    {paragraph.startsWith('- ')
                      ? <ul style={{ paddingLeft: 'var(--space-lg)', margin: 0 }}>
                          {paragraph.split('\n').filter(l => l.startsWith('- ')).map((li, li2) => (
                            <li key={li2}>{li.slice(2)}</li>
                          ))}
                        </ul>
                      : paragraph}
                  </p>
                ))}
              </div>

              {deployError && <div className="auth-error" style={{ marginTop: 'var(--space-md)' }}>{deployError}</div>}
            </div>

            <div className="template-modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedTemplate(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => deployTemplate(selectedTemplate)}
                disabled={deploying}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Zap size={14} />
                {deploying ? 'Deploying...' : 'Deploy Template'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AppShell>
  );
}
