import { MarketCompassApiClient } from "./client";

export async function exampleUsage(baseUrl: string, apiKey: string) {
  const client = new MarketCompassApiClient({ baseUrl, apiKey });

  const companies = await client.companies({ sector: "AI/ML", limit: 10 });
  const firstCompany = companies.data[0];

  if (!firstCompany?.id) return { companies: companies.data, financials: [] };

  const financials = await client.financials({ company_id: firstCompany.id, limit: 8 });
  return { companies: companies.data, financials: financials.data };
}
