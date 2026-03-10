import { createMiddleware } from 'hono/factory';
import { unauthorized } from '../lib/errors.js';

export interface AuthIdentity {
  token: string;
  /** Tenant ID decoded from the scaffold token. Replace with real JWT claims in production. */
  tenantId: string;
}

/** Validates the Authorization: Bearer <token> header.
 *  In this scaffold, any non-empty token is accepted.
 *  Replace with real JWT verification before production. */
export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized(c);
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return unauthorized(c);
  }

  // Scaffold: decode tenantId from the base64 segment of the scaffold token.
  // In production this must be replaced with verified JWT claim extraction.
  let tenantId = 'unknown';
  const parts = token.split('.');
  if (parts.length >= 2) {
    try {
      tenantId = Buffer.from(parts[1], 'base64').toString('utf8');
    } catch {
      // leave tenantId as 'unknown'
    }
  }

  const identity: AuthIdentity = { token, tenantId };
  c.set('identity', identity);
  await next();
});
