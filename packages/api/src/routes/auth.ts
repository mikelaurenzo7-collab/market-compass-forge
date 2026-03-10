import { Hono } from 'hono';
import { z } from 'zod';
import { validationError } from '../lib/errors.js';

export const authRouter = new Hono();

const tokenSchema = z.object({
  tenantId: z.string().min(1),
  secret: z.string().min(8),
});

/**
 * POST /api/auth/token
 * Exchange tenant credentials for an API bearer token.
 * In production, validate against a secrets store and issue a signed JWT.
 */
authRouter.post('/token', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return validationError(c, 'Request body must be valid JSON');
  }

  const result = tokenSchema.safeParse(body);
  if (!result.success) {
    return validationError(c, 'Invalid credentials payload', {
      issues: result.error.flatten().fieldErrors,
    });
  }

  // SCAFFOLD ONLY — the token below is NOT cryptographically signed and must not
  // be used in production. Replace with a real JWT library (e.g. jose) that signs
  // with a secret loaded from an environment variable before deploying.
  const token = `scaffold.${Buffer.from(result.data.tenantId).toString('base64')}`;
  return c.json({ success: true, data: { token, expiresIn: 3600 } });
});
