import { describe, expect, it, vi } from "vitest";
import { buildQuery, MarketCompassApiClient } from "@/lib/api/client";

describe("api client", () => {
  it("buildQuery omits empty values", () => {
    const query = buildQuery({ action: "companies", sector: "AI", empty: "", missing: undefined, nil: null, flag: false });
    expect(query).toContain("action=companies");
    expect(query).toContain("sector=AI");
    expect(query).toContain("flag=false");
    expect(query).not.toContain("empty=");
    expect(query).not.toContain("missing=");
    expect(query).not.toContain("nil=");
  });

  it("parses rate-limit headers", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: "1" }], meta: { total: 1, limit: 1, offset: 0, action: "companies", tier: "professional" } }),
      headers: new Headers({
        "X-RateLimit-Remaining": "9999",
        "X-RateLimit-Tier": "professional",
        "X-RateLimit-Limit": "10000",
      }),
    });

    const client = new MarketCompassApiClient({ baseUrl: "https://example.supabase.co", apiKey: "lpi_test", fetchImpl });
    const result = await client.companies({ limit: 1 });

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(result.rateLimit?.remaining).toBe(9999);
    expect(result.rateLimit?.tier).toBe("professional");
    expect(result.rateLimit?.limit).toBe(10000);
  });

  it("throws API errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Invalid or inactive API key" }),
      headers: new Headers(),
    });

    const client = new MarketCompassApiClient({ baseUrl: "https://example.supabase.co", apiKey: "lpi_test", fetchImpl });
    await expect(client.companies()).rejects.toThrow("Invalid or inactive API key");
  });
});
