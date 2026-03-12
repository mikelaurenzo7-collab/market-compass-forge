'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (json.success) {
        setSent(true);
      } else {
        setError(json.error ?? 'Something went wrong');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div className="auth-page">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="auth-logo">BeastBots</div>
        <h1 className="auth-title">Reset your password</h1>

        {sent ? (
          <>
            <div className="auth-info">
              Check your email for a reset link. It expires in 1 hour.
            </div>
            <p className="auth-footer" style={{ marginTop: 'var(--space-lg)' }}>
              <Link href="/login" className="auth-link">Back to sign in</Link>
            </p>
          </>
        ) : (
          <>
            <p className="auth-subtitle">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <label className="auth-label">
                Email
                <input
                  type="email"
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  autoFocus
                />
              </label>

              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>

            <p className="auth-footer">
              Remember your password?{' '}
              <Link href="/login" className="auth-link">Sign in</Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
