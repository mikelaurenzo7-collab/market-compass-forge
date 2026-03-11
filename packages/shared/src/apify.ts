// Lightweight helper for invoking Apify actors via HTTP.

export interface ApifyCallOptions {
  actorUrl: string; // full run endpoint (e.g. https://api.apify.com/v2/actors/xxx/runs)
  apiKey: string;
  body?: Record<string, unknown>;
  method?: 'GET' | 'POST';
}

export async function callActor<T = any>(opts: ApifyCallOptions): Promise<T> {
  const { actorUrl, apiKey, body, method = 'POST' } = opts;
  const res = await fetch(actorUrl, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Apify actor request failed ${res.status}: ${txt.slice(0,200)}`);
  }
  return res.json() as Promise<T>;
}
