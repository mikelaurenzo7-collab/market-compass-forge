import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { healthRouter } from './routes/health.js';
import { integrationsRouter } from './routes/integrations.js';
import { pricingRouter } from './routes/pricing.js';
import { botsRouter } from './routes/bots.js';
import { safetyRouter } from './routes/safety.js';
import { auditRouter } from './routes/audit.js';
import { authRouter } from './routes/auth.js';
import { onboardingRouter } from './routes/onboarding.js';
import { credentialsRouter } from './routes/credentials.js';
import { provisioningRouter } from './routes/provisioning.js';
import { closeDb } from './lib/db.js';

export const app = new Hono();

// Fail-fast: ensure required secrets are present in environment
function ensureRequiredEnvs() {
  const required = ['JWT_SECRET', 'ENCRYPTION_KEY'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error('[CONFIG] Missing required env:', missing.join(', '));
    throw new Error(`Missing required env: ${missing.join(', ')}`);
  }
}

// Skip strict env enforcement during test runs so tests can set envs per-file
if (process.env.NODE_ENV !== 'test') {
  ensureRequiredEnvs();
}

// ─── Rate Limiting ────────────────────────────────────────────
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function rateLimit(windowMs: number, maxRequests: number) {
  return async (c: any, next: any) => {
    const key = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';
    const now = Date.now();
    const entry = rateLimitStore.get(key);
    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count++;
      if (entry.count > maxRequests) {
        return c.json({ success: false, error: 'Too many requests' }, 429);
      }
    }
    await next();
  };
}

// ─── Middleware ────────────────────────────────────────────────
app.use('*', cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Security headers
app.use('*', async (c, next) => {
  await next();
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('X-Frame-Options', 'DENY');
  c.res.headers.set('X-XSS-Protection', '0');
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
});

// Body size limit (1MB)
app.use('*', async (c, next) => {
  const contentLength = c.req.header('content-length');
  if (contentLength && parseInt(contentLength) > 1_048_576) {
    return c.json({ success: false, error: 'Request body too large' }, 413);
  }
  await next();
});

// Rate limit auth endpoints: 20 requests per minute
app.use('/api/auth/*', rateLimit(60_000, 20));
// Global rate limiter: 100 requests per minute per IP
app.use('*', rateLimit(60_000, 100));

// ─── Error Handler ────────────────────────────────────────────
app.onError((err, c) => {
  console.error(`[API Error] ${c.req.method} ${c.req.url}:`, err.message);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

// ─── Routes ───────────────────────────────────────────────────
app.get('/', (c) => c.json({ success: true, data: { name: 'BeastBots API', version: '0.1.0' } }));
app.route('/api/health', healthRouter);
app.route('/api/auth', authRouter);
app.route('/api/onboarding', onboardingRouter);
app.route('/api/credentials', credentialsRouter);
app.route('/api/integrations', integrationsRouter);
app.route('/api/pricing', pricingRouter);
app.route('/api/bots', botsRouter);
app.route('/api/safety', safetyRouter);
app.route('/api/audit', auditRouter);
app.route('/api/provisioning', provisioningRouter);

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  const port = Number(process.env.PORT ?? 4000);
  const server = serve({ fetch: app.fetch, port });
  console.log(`BeastBots API listening on http://localhost:${port}`);

  // Graceful shutdown
  function shutdown() {
    console.log('[Shutdown] Closing server...');
    server.close(() => {
      closeDb();
      console.log('[Shutdown] Clean exit');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000);
  }
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export default app;
