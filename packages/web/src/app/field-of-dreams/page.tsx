'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  Check,
  CircleX,
  Compass,
  Gauge,
  GitBranch,
  LayoutDashboard,
  Rocket,
  Shield,
  Sparkles,
  Workflow,
  Wrench,
} from 'lucide-react';
import styles from './field-of-dreams.module.css';

type StackSource = {
  name: 'Base44' | 'Lovable' | 'Get.Mocha' | 'Replit';
  best: string[];
  worst: string[];
  dreamPattern: string;
};

type Blueprint = {
  id: 'solo' | 'studio' | 'enterprise';
  label: string;
  target: string;
  sprintPlan: string[];
  qualityGate: string;
};

const STACK_SOURCES: StackSource[] = [
  {
    name: 'Base44',
    best: [
      'Fast idea-to-UI acceleration',
      'Low friction starter scaffolds',
      'Rapid iteration loops',
    ],
    worst: [
      'Generated abstractions can become hard to reason about',
      'Patterns may drift without strong architecture guardrails',
      'Output quality can vary across sessions',
    ],
    dreamPattern: 'Keep the speed, enforce architecture contracts from day one.',
  },
  {
    name: 'Lovable',
    best: [
      'Great product storytelling in generated interfaces',
      'Prompt-friendly UX iteration',
      'Strong visual polish momentum',
    ],
    worst: [
      'Polish can mask weak data or state models',
      'Prompt churn can produce inconsistent component systems',
      'Refactor depth may lag behind UI generation speed',
    ],
    dreamPattern: 'Keep the design velocity, bind every screen to typed domain models.',
  },
  {
    name: 'Get.Mocha',
    best: [
      'Workflow-first automation mindset',
      'Useful orchestration patterns for product flows',
      'Fast composition of business logic loops',
    ],
    worst: [
      'Workflow sprawl risk without governance',
      'Debuggability suffers when automations are opaque',
      'Business rules can become brittle if not versioned',
    ],
    dreamPattern: 'Keep orchestration power, add traceability and versioned workflows.',
  },
  {
    name: 'Replit',
    best: [
      'Cloud-native collaboration and instant environments',
      'Low setup friction for shipping quickly',
      'Great prototype-to-deploy continuity',
    ],
    worst: [
      'Environment drift can still occur without pinned runtime contracts',
      'Cost/perf can become unpredictable at scale',
      'Production observability needs stronger defaults',
    ],
    dreamPattern: 'Keep instant shipping, add deterministic environments and SLO-driven ops.',
  },
];

const BLUEPRINTS: Blueprint[] = [
  {
    id: 'solo',
    label: 'Solo Visionary',
    target: 'One founder, one bold product loop.',
    sprintPlan: [
      'Dream brief -> product map in 10 minutes',
      'Auto-generate responsive views + typed state',
      'Ship a private beta with analytics in one sprint',
    ],
    qualityGate: 'No deploy unless tests, accessibility checks, and rollback hooks pass.',
  },
  {
    id: 'studio',
    label: 'Creator Studio',
    target: 'Small team building quickly without chaos.',
    sprintPlan: [
      'Shared prompt board with versioned intents',
      'Component system generated once, reused everywhere',
      'Feature flags + preview links for every merge',
    ],
    qualityGate: 'No merge unless design tokens, data contracts, and event schemas stay aligned.',
  },
  {
    id: 'enterprise',
    label: 'Enterprise Orbit',
    target: 'Multi-squad roadmap with compliance and uptime targets.',
    sprintPlan: [
      'Governed workflow templates per business domain',
      'Audit-ready deployment chain and cost budgets',
      'Auto-remediation playbooks tied to SLO alerts',
    ],
    qualityGate: 'No production promotion unless policy checks, drift checks, and runbook simulation pass.',
  },
];

const HERO_METRICS = [
  { label: 'Idea to Working Prototype', value: '30 min' },
  { label: 'Mobile + Web Coverage', value: '100%' },
  { label: 'Deploy Confidence', value: 'SLO-gated' },
  { label: 'Code Ownership', value: 'Fully portable' },
];

const CORE_PILLARS = [
  {
    title: 'Dream Composer',
    icon: <Sparkles size={18} />,
    detail: 'Turn natural language vision into typed product specs, user flows, and data contracts.',
  },
  {
    title: 'Transparent Core',
    icon: <Wrench size={18} />,
    detail: 'Every generated line is editable, testable, and exportable. Zero black-box lock-in.',
  },
  {
    title: 'Flow Orchestrator',
    icon: <Workflow size={18} />,
    detail: 'Versioned workflow graph with replay, debugging traces, and policy-aware automation.',
  },
  {
    title: 'Live Build Arena',
    icon: <LayoutDashboard size={18} />,
    detail: 'Real-time collaboration, preview links, and visual diff for every prompt or code change.',
  },
  {
    title: 'Guarded Launch',
    icon: <Shield size={18} />,
    detail: 'Policy checks, accessibility checks, runtime tests, and rollback plans before ship.',
  },
  {
    title: 'Scale Radar',
    icon: <Gauge size={18} />,
    detail: 'Cost, latency, and error budgets monitored continuously with smart remediation.',
  },
];

const ANTI_PATTERNS = [
  'Opaque generated code that teams cannot own',
  'UI-first builds without domain-model integrity',
  'Workflow spaghetti without versioning and replay',
  'Environment drift between preview and production',
  'Deploys without observability, rollback, or cost guardrails',
];

export default function FieldOfDreamsPage() {
  const [activeBlueprint, setActiveBlueprint] = useState<Blueprint['id']>('solo');

  const selectedBlueprint = useMemo(
    () => BLUEPRINTS.find((blueprint) => blueprint.id === activeBlueprint) ?? BLUEPRINTS[0],
    [activeBlueprint],
  );

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={styles.badge}
        >
          <Bot size={14} />
          Field of Dreams · Elite Product Forge
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={styles.title}
        >
          Build what others only pitch.
          <span>Cross-platform. AI-native. Production-real.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={styles.subtitle}
        >
          Field of Dreams blends the strongest traits of Base44, Lovable, Get.Mocha, and Replit
          into one visionary stack—while systematically removing fragility, opacity, and drift.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={styles.actions}
        >
          <Link href="#blueprint-lab" className={styles.primaryCta}>
            Start the Blueprint Lab <ArrowRight size={16} />
          </Link>
          <Link href="/" className={styles.secondaryCta}>
            Back to BeastBots
          </Link>
        </motion.div>
        <div className={styles.metricsGrid}>
          {HERO_METRICS.map((metric) => (
            <article key={metric.label} className={styles.metricCard}>
              <p>{metric.value}</p>
              <span>{metric.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2>Best-in synthesis map</h2>
          <p>What we keep, what we reject, and how we transcend each platform pattern.</p>
        </header>
        <div className={styles.analysisGrid}>
          {STACK_SOURCES.map((source) => (
            <article key={source.name} className={styles.analysisCard}>
              <h3>{source.name}</h3>
              <div className={styles.listBlock}>
                <p>
                  <Check size={14} />
                  Best aspects to preserve
                </p>
                <ul>
                  {source.best.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className={styles.listBlock}>
                <p className={styles.riskTitle}>
                  <CircleX size={14} />
                  Worst aspects to remove
                </p>
                <ul>
                  {source.worst.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className={styles.dreamPattern}>
                <Compass size={14} />
                {source.dreamPattern}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2>Field of Dreams architecture</h2>
          <p>The elite core that powers mobile and web with one product brain.</p>
        </header>
        <div className={styles.pillarGrid}>
          {CORE_PILLARS.map((pillar) => (
            <article key={pillar.title} className={styles.pillarCard}>
              <div className={styles.pillarIcon}>{pillar.icon}</div>
              <h3>{pillar.title}</h3>
              <p>{pillar.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="blueprint-lab" className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2>Blueprint Lab</h2>
          <p>Choose your operating model and watch the launch system adapt.</p>
        </header>
        <div className={styles.labWrap}>
          <nav className={styles.tabBar} aria-label="Field of Dreams blueprint modes">
            {BLUEPRINTS.map((blueprint) => (
              <button
                key={blueprint.id}
                type="button"
                onClick={() => setActiveBlueprint(blueprint.id)}
                className={`${styles.tabButton} ${activeBlueprint === blueprint.id ? styles.activeTab : ''}`}
              >
                {blueprint.label}
              </button>
            ))}
          </nav>
          <article className={styles.blueprintCard}>
            <p className={styles.blueprintTarget}>
              <GitBranch size={14} />
              {selectedBlueprint.target}
            </p>
            <h3>Launch sequence</h3>
            <ol>
              {selectedBlueprint.sprintPlan.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className={styles.qualityGate}>
              <Rocket size={14} />
              {selectedBlueprint.qualityGate}
            </div>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2>Non-negotiables: what we refuse to ship</h2>
          <p>Vision means ambition with discipline—not beautiful chaos.</p>
        </header>
        <ul className={styles.antiPatternList}>
          {ANTI_PATTERNS.map((antiPattern) => (
            <li key={antiPattern}>
              <CircleX size={15} />
              {antiPattern}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
