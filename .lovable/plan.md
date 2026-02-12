## Real Data Integration

### Completed

**1. News feed now uses real data (Perplexity + Gemini fallback)**
- `fetch-news` edge function rewired to Perplexity Sonar for grounded real-time news search
- Falls back to Gemini with explicit "real news only" instructions if Perplexity unavailable
- Citations from Perplexity attached as `source_url` on articles

**2. Intelligence signals now use real data**
- New `fetch-intelligence` edge function fetches real market signals across 6 categories (PE/M&A, Real Estate, Venture, Credit, Macro, Personnel)
- Uses Perplexity with `search_recency_filter: "month"` for fresh data
- Falls back to Gemini with structured function calling

**3. Auto-enrich companies on view**
- New `useAutoEnrich` hook triggers Firecrawl scraping when a company is viewed
- Only triggers if no enrichment data exists or data is >7 days old
- Prevents duplicate triggers with ref guard

**4. UI updated to reflect real data**
- NewsFeed "Generate" button renamed to "Fetch Latest News"
- IntelligenceFeed has new "Refresh" and "Fetch Real-Time Signals" buttons
- All language updated from "AI-generated" to "real-time" framing

### Data sources
- **Company enrichment**: Firecrawl (website scraping + web search)
- **News**: Perplexity Sonar (real-time search) → Gemini fallback
- **Intelligence signals**: Perplexity Sonar → Gemini fallback
- **Financials/funding**: Existing database (synthetic — needs real API integration)
- **Distressed assets/CRE**: Existing database (synthetic — needs real API integration)

### Still synthetic (requires premium data APIs)
- Company financials (revenue, ARR, burn rate)
- Funding rounds and valuations
- Distressed asset listings
- CRE market data and transactions
- Precedent transaction multiples
