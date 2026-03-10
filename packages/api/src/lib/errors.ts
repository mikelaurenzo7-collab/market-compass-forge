import type { Context } from 'hono';
import { ERROR_CODES, type ApiErrorResponse } from '@beastbots/shared';

export function jsonError(
  c: Context,
  status: 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500,
  code: string,
  message: string,
  details?: Record<string, unknown>
): Response {
  const body: ApiErrorResponse = {
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  };
  return c.json(body, status);
}

export function unauthorized(c: Context, message = 'Authentication required') {
  return jsonError(c, 401, ERROR_CODES.UNAUTHORIZED, message);
}

export function forbidden(c: Context, message = 'Insufficient permissions') {
  return jsonError(c, 403, ERROR_CODES.FORBIDDEN, message);
}

export function notFound(c: Context, message = 'Resource not found') {
  return jsonError(c, 404, ERROR_CODES.NOT_FOUND, message);
}

export function validationError(c: Context, message: string, details?: Record<string, unknown>) {
  return jsonError(c, 422, ERROR_CODES.VALIDATION_ERROR, message, details);
}

export function internalError(c: Context, message = 'Internal server error') {
  return jsonError(c, 500, ERROR_CODES.INTERNAL_ERROR, message);
}
