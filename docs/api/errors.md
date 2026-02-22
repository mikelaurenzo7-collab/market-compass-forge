# Error Contract

Errors are JSON with at minimum `error`.

## 400 Bad Request

Unknown action:

```json
{
  "error": "Unknown action: foo",
  "available_actions": ["companies", "financials", "..."]
}
```

## 401 Unauthorized

Invalid API key format:

```json
{
  "error": "Invalid API key format. Keys must start with lpi_",
  "docs": "See /developers for API documentation"
}
```

Invalid/disabled/expired key:

```json
{ "error": "Invalid or inactive API key" }
```

or

```json
{ "error": "API key has expired" }
```

## 429 Too Many Requests

```json
{
  "error": "Rate limit exceeded",
  "tier": "professional",
  "message": "professional tier limit reached. Upgrade for higher limits."
}
```

Headers:

- `X-RateLimit-Remaining`
- `X-RateLimit-Tier`
- `X-RateLimit-Limit`

## 500 Internal Server Error

```json
{ "error": "<runtime message>" }
```
