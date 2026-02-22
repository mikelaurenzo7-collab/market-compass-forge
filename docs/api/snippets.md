# Client Snippets

## cURL

```bash
curl -sS \
  -H "Authorization: Bearer lpi_YOUR_KEY" \
  "$SUPABASE_URL/functions/v1/api-access?action=screening&sector=Fintech&min_revenue=10000000&limit=50"
```

## JavaScript / fetch

```ts
const resp = await fetch(`${baseUrl}/functions/v1/api-access?action=news&limit=20`, {
  headers: { Authorization: `Bearer ${apiKey}` },
});
const payload = await resp.json();
```

## Python / requests

```py
import requests

resp = requests.get(
    f"{BASE}/functions/v1/api-access",
    params={"action": "financials", "company_id": company_id, "limit": 25},
    headers={"Authorization": f"Bearer {api_key}"},
)
resp.raise_for_status()
print(resp.json()["data"])
```

## TypeScript SDK (local wrapper)

```ts
import { MarketCompassApiClient } from "@/lib/api";

const client = new MarketCompassApiClient({
  baseUrl: import.meta.env.VITE_SUPABASE_URL,
  apiKey: "lpi_...",
});

const companies = await client.companies({ sector: "AI/ML", limit: 25 });
```


### SDK coverage

The `MarketCompassApiClient` ships wrappers for all supported actions:
`companies`, `marketData`, `screening`, `financials`, `funding`, `investors`, `news`, `distressed`, `deals`, `funds`, `globalOpportunities`, `realEstate`, `signals`, and `precedentTransactions`.

Each response includes parsed rate-limit headers at `response.rateLimit` (`remaining`, `tier`, `limit`).
