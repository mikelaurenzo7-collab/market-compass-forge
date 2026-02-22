# Market Compass API

Base URL:

```text
https://<your-project-ref>.supabase.co/functions/v1/api-access
```

Authentication:

```http
Authorization: Bearer lpi_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Request model

All resources are requested from a single endpoint and selected with `action`.

```http
GET /functions/v1/api-access?action=companies&limit=50&offset=0
```

### Common query params

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `action` | string | `companies` | Logical endpoint selector |
| `limit` | number | `50` | Max `500` |
| `offset` | number | `0` | Zero-based pagination offset |

## Pagination contract

Successful responses always include:

```json
{
  "data": [],
  "meta": {
    "total": 7844,
    "limit": 50,
    "offset": 0,
    "action": "companies",
    "tier": "professional"
  }
}
```

See [pagination.md](./pagination.md) for guidance.

## Rate limiting and observability

Responses include:

- `X-RateLimit-Remaining`: remaining requests in current daily window.
- `X-RateLimit-Tier`: plan tier used for policy (`free`, `professional`, `enterprise`, etc).
- `X-RateLimit-Limit`: daily request cap enforced for the caller tier.

Daily limits currently enforced in `api-access`:

- free/analyst/essential: 500/day
- professional/pro: 10,000/day
- enterprise/institutional: 1,000,000/day

## Endpoint catalog

See [endpoints.md](./endpoints.md).

## Error contract

See [errors.md](./errors.md).

## Product audit

See [product-audit.md](./product-audit.md) for a production-readiness audit and remediation status.
