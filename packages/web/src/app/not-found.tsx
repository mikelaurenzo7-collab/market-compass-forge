import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-logo">BeastBots</div>
        <h1 className="auth-title">404</h1>
        <p className="auth-subtitle">Page not found</p>
        <Link href="/" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-block', marginTop: 'var(--space-md)' }}>
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
