'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!token) {
      setError('Missing reset token. Please use the link from your email.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
      } else {
        setError(json.error ?? 'Failed to reset password');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  }

  if (!token) {
    return (
      <div className="auth-page">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="auth-logo">BeastBots</div>
          <h1 className="auth-title">Invalid reset link</h1>
          <p className="auth-subtitle">
            This link is missing a reset token. Please request a new password reset.
          </p>
          <p className="auth-footer" style={{ marginTop: 'var(--space-lg)' }}>
            <Link href="/forgot-password" className="auth-link">Request new reset link</Link>
          </p>
        </motion.div>
      </div>
    );
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
        <h1 className="auth-title">Set new password</h1>

        {success ? (
          <>
            <div className="auth-info">
              Your password has been reset. All existing sessions have been signed out for security.
            </div>
            <p className="auth-footer" style={{ marginTop: 'var(--space-lg)' }}>
              <Link href="/login" className="auth-link">Sign in with your new password</Link>
            </p>
          </>
        ) : (
          <>
            <p className="auth-subtitle">
              Choose a strong password for your account. All existing sessions will be signed out.
            </p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <label className="auth-label">
                New Password
                <input
                  type="password"
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  autoComplete="new-password"
                  autoFocus
                  minLength={8}
                />
              </label>

              <label className="auth-label">
                Confirm Password
                <input
                  type="password"
                  className="auth-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  autoComplete="new-password"
                  minLength={8}
                />
              </label>

              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset password'}
              </button>
            </form>

            <p className="auth-footer">
              <Link href="/login" className="auth-link">Back to sign in</Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
