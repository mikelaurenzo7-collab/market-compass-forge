'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    fetch(`${apiBase}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (json.success) {
          setStatus('success');
          setMessage(json.data?.message ?? 'Email verified successfully.');
        } else {
          setStatus('error');
          setMessage(json.error ?? 'Verification failed.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error. Please try again.');
      });
  }, [token]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0f1e', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        {status === 'verifying' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>
            <h1 style={{ color: '#e2e8f0', fontSize: '1.5rem', fontWeight: 700 }}>Verifying your email...</h1>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
            <h1 style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: 700 }}>Email Verified!</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, margin: '1rem 0' }}>{message}</p>
            <Link
              href="/login"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                textDecoration: 'none',
                padding: '10px 24px',
                borderRadius: '8px',
                fontWeight: 600,
                marginTop: '0.5rem',
              }}
            >
              Continue to Login
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>❌</div>
            <h1 style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 700 }}>Verification Failed</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, margin: '1rem 0' }}>{message}</p>
            <Link
              href="/login"
              style={{
                display: 'inline-block',
                background: 'rgba(255,255,255,0.06)',
                color: '#e2e8f0',
                textDecoration: 'none',
                padding: '10px 24px',
                borderRadius: '8px',
                fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.1)',
                marginTop: '0.5rem',
              }}
            >
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0f1e' }}>
        <div style={{ color: '#94a3b8' }}>Loading...</div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
