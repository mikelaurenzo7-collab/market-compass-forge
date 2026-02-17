import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://kilhdiuacbylampaukza.supabase.co";
const API_BASE = `${SUPABASE_URL}/functions/v1/api-access`;

const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Grapevine Intelligence API",
    description: "Access private market intelligence: companies, financials, deals, distressed assets, funds, global opportunities, real estate, and AI-generated signals.",
    version: "1.0.0",
  },
  servers: [{ url: API_BASE }],
  paths: {
    "/": {
      get: {
        operationId: "queryData",
        summary: "Query Grapevine data across all asset classes",
        description: "A single endpoint that returns different data based on the 'action' parameter. Supports companies, financials, funding rounds, deals, distressed assets, funds, global opportunities, real estate, intelligence signals, news, investors, precedent transactions, screening, and macro indicators.",
        parameters: [
          {
            name: "action",
            in: "query",
            required: true,
            schema: {
              type: "string",
              enum: [
                "companies", "financials", "funding", "deals", "distressed",
                "funds", "global-opportunities", "real-estate", "signals",
                "news", "investors", "precedent-transactions", "screening",
                "macro",
              ],
            },
            description: "The data type to query. Each action supports different filter parameters.",
          },
          { name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 500 }, description: "Max results to return (default 50, max 500)" },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 }, description: "Pagination offset" },
          // Company filters
          { name: "search", in: "query", schema: { type: "string" }, description: "Search by name (for companies, investors)" },
          { name: "sector", in: "query", schema: { type: "string" }, description: "Filter by sector (companies, distressed, precedent-transactions, global-opportunities)" },
          { name: "stage", in: "query", schema: { type: "string" }, description: "Filter by stage (companies, screening)" },
          { name: "market_type", in: "query", schema: { type: "string" }, description: "Filter by market type: private or public (companies, screening)" },
          // Financial filters
          { name: "company_id", in: "query", schema: { type: "string", format: "uuid" }, description: "Filter by company ID (financials, funding, news)" },
          // Deal filters
          { name: "deal_type", in: "query", schema: { type: "string" }, description: "Filter by deal type: M&A, LBO, Growth Equity (deals, precedent-transactions)" },
          { name: "industry", in: "query", schema: { type: "string" }, description: "Filter by target industry (deals)" },
          { name: "status", in: "query", schema: { type: "string" }, description: "Filter by status (deals, distressed)" },
          { name: "min_value", in: "query", schema: { type: "number" }, description: "Minimum deal value (deals, global-opportunities)" },
          // Distressed filters
          { name: "distress_type", in: "query", schema: { type: "string" }, description: "bankruptcy, receivership, voluntary_sale (distressed)" },
          { name: "asset_type", in: "query", schema: { type: "string" }, description: "business, real_estate, equipment (distressed)" },
          { name: "min_discount", in: "query", schema: { type: "number" }, description: "Minimum discount percentage (distressed)" },
          // Fund filters
          { name: "strategy", in: "query", schema: { type: "string" }, description: "Fund strategy: buyout, venture, growth (funds)" },
          { name: "min_irr", in: "query", schema: { type: "number" }, description: "Minimum net IRR (funds)" },
          { name: "vintage_year", in: "query", schema: { type: "integer" }, description: "Filter by vintage year (funds)" },
          // Global opportunity filters
          { name: "region", in: "query", schema: { type: "string" }, description: "Region: MENA, Asia-Pacific, Europe, etc. (global-opportunities)" },
          { name: "country", in: "query", schema: { type: "string" }, description: "Country filter (global-opportunities)" },
          { name: "opportunity_type", in: "query", schema: { type: "string" }, description: "pe_vc, infrastructure, real_estate (global-opportunities)" },
          // Real estate filters
          { name: "property_type", in: "query", schema: { type: "string" }, description: "Office, Industrial, Multifamily (real-estate)" },
          { name: "state", in: "query", schema: { type: "string" }, description: "State abbreviation (real-estate)" },
          { name: "city", in: "query", schema: { type: "string" }, description: "City name (real-estate)" },
          // Signal/news filters
          { name: "category", in: "query", schema: { type: "string" }, description: "Signal category: pe_ma, venture, macro (signals)" },
          { name: "sentiment", in: "query", schema: { type: "string" }, description: "bullish, bearish, neutral (signals, news)" },
          // Screening filters
          { name: "min_revenue", in: "query", schema: { type: "number" }, description: "Min revenue filter (screening)" },
          { name: "max_revenue", in: "query", schema: { type: "number" }, description: "Max revenue filter (screening)" },
          { name: "min_arr", in: "query", schema: { type: "number" }, description: "Min ARR filter (screening)" },
          // Macro filters
          { name: "series_id", in: "query", schema: { type: "string" }, description: "FRED series ID (macro)" },
        ],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { type: "object" }, description: "Array of results" },
                    meta: {
                      type: "object",
                      properties: {
                        total: { type: "integer" },
                        limit: { type: "integer" },
                        offset: { type: "integer" },
                        action: { type: "string" },
                        tier: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Invalid or missing API key" },
          "429": { description: "Rate limit exceeded" },
        },
        security: [{ bearerAuth: [] }],
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "API key with lpi_ prefix. Create one in Settings → API Access.",
      },
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(JSON.stringify(openApiSpec, null, 2), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
});
