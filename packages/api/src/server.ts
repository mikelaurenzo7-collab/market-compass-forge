import dotenv from 'dotenv';
import { dirname, isAbsolute, resolve } from 'node:path';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { healthRouter } from './routes/health.js';
import { integrationsRouter } from './routes/integrations.js';
import { pricingRouter } from './routes/pricing.js';
import { botsRouter } from './routes/bots.js';
import { restoreRuntimes } from './routes/bots.js';
import { safetyRouter } from './routes/safety.js';
import { auditRouter } from './routes/audit.js';
import { authRouter } from './routes/auth.js';
import { onboardingRouter } from './routes/onboarding.js';
import { credentialsRouter } from './routes/credentials.js';
import { provisioningRouter } from './routes/provisioning.js';
import { analyticsRouter } from './routes/analytics.js';
import mcpRouter from './routes/mcp.js';
import { templatesRouter } from './routes/templates.js';
import { webhooksRouter } from './routes/webhooks.js';
import { notificationsRouter } from './routes/notifications.js';
import { mfaRouter } from './routes/mfa.js';
import { federatedRouter } from './routes/federated.js';
import { complianceRouter } from './routes/compliance.js';
import { pushRouter } from './routes/push.js';
import { performanceRouter } from './routes/performance.js';
import { alertsRouter } from './routes/alerts.js';
import { closeDb, getDb } from './lib/db.js';
import { setSafetyStore } from '@beastbots/shared';
import { DbSafetyStore } from './lib/safety-store.js';

// Load env vars from both cwd and monorepo root to support workspace npm scripts.
dotenv.config();
const serverDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(serverDir, '../../..');
dotenv.config({ path: resolve(repoRoot, '.env') });

if (process.env.DATABASE_PATH && !isAbsolute(process.env.DATABASE_PATH)) {
  process.env.DATABASE_PATH = resolve(repoRoot, process.env.DATABASE_PATH);
}

// Wire DB-backed safety store for persistence
setSafetyStore(new DbSafetyStore());

export const app = new Hono();

// Fail-fast: ensure required secrets are present in environment
function ensureRequiredEnvs() {
  const required = ['JWT_SECRET', 'ENCRYPTION_KEY'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error('[CONFIG] Missing required env:', missing.join(', '));
    throw new Error(`Missing required env: ${missing.join(', ')}`);
  }

  // Warn about recommended env vars so operators know what is unconfigured
  const recommended = [
    'RESEND_API_KEY',
    'FRONTEND_URL',
    'API_BASE_URL',
    'WORKERS_BASE_URL',
    'WORKER_AUTH_TOKEN',
    'SHOPIFY_WEBHOOK_SECRET',
    'COINBASE_WEBHOOK_SECRET',
    'ALPACA_WEBHOOK_SECRET',
  ];
  const unset = recommended.filter((k) => !process.env[k]);
  if (unset.length > 0) {
    console.warn('[CONFIG] Recommended env vars not set (some features disabled):', unset.join(', '));
  }
}

// Skip strict env enforcement during test runs so tests can set envs per-file
if (process.env.NODE_ENV !== 'test') {
  ensureRequiredEnvs();
}

// ─── Rate Limiting ────────────────────────────────────────────
function rateLimit(windowMs: number, maxRequests: number) {
  return async (c: any, next: any) => {
    // In production behind Cloudflare, cf-connecting-ip is set by CF edge and cannot be spoofed.
    // In non-CF environments, fall back to the socket remote address via c.env to avoid header spoofing.
    const key = c.req.header('cf-connecting-ip')
      ?? (c.env?.incoming?.socket?.remoteAddress as string | undefined)
      ?? 'unknown';
    const now = Date.now();
    const resetAt = now + windowMs;
    const db = getDb();
    // Atomic upsert: insert or reset if window expired, otherwise increment
    db.prepare(`
      INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET
        count = CASE WHEN reset_at < ? THEN 1 ELSE count + 1 END,
        reset_at = CASE WHEN reset_at < ? THEN ? ELSE reset_at END
    `).run(key, resetAt, now, now, resetAt);

    const row = db.prepare('SELECT count, reset_at FROM rate_limits WHERE key = ?').get(key) as { count: number; reset_at: number } | undefined;
    if (row && row.count > maxRequests) {
      return c.json({ success: false, error: 'Too many requests' }, 429);
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
  c.res.headers.set('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
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
app.route('/api/auth/mfa', mfaRouter);
app.route('/api/onboarding', onboardingRouter);
app.route('/api/credentials', credentialsRouter);
app.route('/api/integrations', integrationsRouter);
app.route('/api/pricing', pricingRouter);
app.route('/api/bots', botsRouter);
app.route('/api/safety', safetyRouter);
app.route('/api/audit', auditRouter);
app.route('/api/analytics', analyticsRouter);
app.route('/api/provisioning', provisioningRouter);
app.route('/api/templates', templatesRouter);
app.route('/api/webhooks', webhooksRouter);
app.route('/api/notifications', notificationsRouter);
app.route('/api/federated', federatedRouter);
app.route('/api/compliance', complianceRouter);
app.route('/api/push', pushRouter);
app.route('/api/performance', performanceRouter);
app.route('/api/alerts', alertsRouter);
app.route('/api/mcp', mcpRouter); // proxy for MCP JSON-RPC

const isDirectExecution = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(entry).href;
  } catch {
    return false;
  }
})();

if (isDirectExecution) {
  const port = Number(process.env.PORT ?? 4000);
  const server = serve({ fetch: app.fetch, port });
  console.log(`BeastBots API listening on http://localhost:${port}`);

  // Restore runtimes for bots that were running before shutdown
  restoreRuntimes();

  // Periodic cleanup: expired tokens, OAuth states, rate limit entries (every 15 min)
  const cleanupInterval = setInterval(() => {
    try {
      const db = getDb();
      const now = Date.now();
      db.prepare('DELETE FROM refresh_tokens WHERE expires_at < ? OR revoked = 1').run(now);
      db.prepare('DELETE FROM oauth_states WHERE expires_at < ?').run(now);
      db.prepare('DELETE FROM rate_limits WHERE reset_at < ?').run(now);
    } catch (err) {
      console.error('[Cleanup] Error:', err);
    }
  }, 15 * 60 * 1000);

  // Graceful shutdown
  function shutdown() {
    console.log('[Shutdown] Closing server...');
    clearInterval(cleanupInterval);
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
