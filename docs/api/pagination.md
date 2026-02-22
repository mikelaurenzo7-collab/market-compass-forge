# Pagination

The API uses offset pagination on every action.

## Request

- `limit`: number of records to return (max 500).
- `offset`: index of the first record in the current page.

Example:

```http
GET /functions/v1/api-access?action=deals&limit=100&offset=200
```

## Response

`meta.total` gives total rows matching filters in the backing query.

```json
{
  "data": [{ "id": "..." }],
  "meta": {
    "total": 1250,
    "limit": 100,
    "offset": 200,
    "action": "deals",
    "tier": "professional",
    "current_hour_requests": 8
  }
}
```

## Recommended client loop

1. Start with `offset=0`.
2. Increment by `limit`.
3. Stop when `offset + data.length >= meta.total`.
4. Read `X-RateLimit-Remaining` to avoid overruns.
