# API Product Audit (Full)

This audit reviews API readiness across docs, key lifecycle, client integration, observability, and billing-aware limits.

## Scope

- Edge function: `supabase/functions/api-access/index.ts`
- Key lifecycle UX: `src/components/ApiKeyManager.tsx`
- API docs: `docs/api/*`
- SDK wrapper: `src/lib/api/*`
- RLS observability policy: `supabase/migrations/20260218090000_api_observability_user_policies.sql`

## Findings and status

### 1) Endpoint and contract documentation

- ✅ Endpoint actions and action-specific filters documented.
- ✅ Common pagination contract (`limit`, `offset`, `meta.total`) documented.
- ✅ Error contract documented for 400/401/429/500.

### 2) API key lifecycle

- ✅ Key creation with one-time secret reveal.
- ✅ Optional expiry configured in UI.
- ✅ Key rotation workflow provided.
- ✅ Masked prefix and key status exposed.

### 3) Client integration surface

- ✅ Minimal TypeScript SDK wrapper added.
- ✅ Code snippets (cURL, JS, Python, TS) published.
- ⚠️ SDK currently provides convenience methods for a subset of actions (`companies`, `financials`, `funding`) and generic `request()` for others.

### 4) Observability and rate limits

- ✅ Daily rate limit enforced by tier and surfaced in response headers.
- ✅ Hourly rate window now tracked in `rate_limits` for user observability.
- ✅ Request telemetry now inserted into `api_telemetry` on success, throttles, and internal errors.
- ✅ RLS policies allow users to query their own `api_telemetry` and `rate_limits` rows.

### 5) Billing/entitlement alignment

- ✅ UI consumption panel derives plan tier and entitlement limit.
- ⚠️ Runtime API enforcement currently uses tier mapping in `api-access`; it does not yet dynamically read `plan_entitlements` for limits.

## Recommended next iteration

1. Move API limit source-of-truth entirely to `plan_entitlements` for both backend and UI.
2. Add action-level scopes enforcement using `api_keys.scopes`.
3. Add cursor pagination for very large datasets.
4. Expand SDK convenience methods across all actions and publish as package.
