import Link from 'next/link';
import { ReactNode } from 'react';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <header style={{ padding: '32px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ textDecoration: 'none', color: 'var(--accent-green)', fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
          BeastBots
        </Link>
        <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Link href="/pricing" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Pricing</Link>
          <Link href="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Log in</Link>
          <Link href="/signup" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>Get Started</Link>
        </nav>
      </header>
      <main style={{ textAlign: 'center', padding: '120px 24px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '24px' }}>
          Autonomous operators for trading, ecommerce &amp; social
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '680px', margin: '0 auto 40px' }}>
          Turn your ideas into self-driving bots that execute strategies, manage inventory, publish content, and more—all with built‑in safety checks and real‑time monitoring.
        </p>
        <Link href="/signup" className="btn btn-primary" style={{ fontSize: '1rem', padding: '16px 32px' }}>
          Try for free →
        </Link>
      </main>
      <section style={{ padding: '60px 24px', background: 'var(--bg-secondary)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '32px' }}>How it works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '40px', maxWidth: '1000px', margin: '0 auto' }}>
          <div>
            <h3>1. Connect a platform</h3>
            <p>Add your exchange, store, or social account in seconds. Paper mode keeps you safe while you experiment.</p>
          </div>
          <div>
            <h3>2. Choose a strategy</h3>
            <p>Select from pre-built strategies or define your own logic. Configure risk, budget, and autonomy.</p>
          </div>
          <div>
            <h3>3. Deploy your bot</h3>
            <p>Start it running and watch the dashboard for live metrics, audit logs, and safety approvals.</p>
          </div>
        </div>
      </section>
      <footer style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        &copy; {new Date().getFullYear()} BeastBots. All rights reserved.
      </footer>
    </div>
  );
}