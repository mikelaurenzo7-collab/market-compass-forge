

# Ship-Ready Audit: Make Dad Proud

## What Needs to Happen

This is a "show your dad" moment. That means: the landing page needs to feel premium, the dashboard needs to show real depth, the data needs to look credible (200+ companies, consistent formatting), and the whole experience needs to feel like a product -- not a prototype.

## Changes

### 1. Expand to 200+ Companies with Full Data

Currently: 155 companies, 53 missing funding rounds, inconsistent country codes ("US" vs "United States", "GB" vs "United Kingdom").

**Data insertion plan:**
- Add 55+ new private companies across existing sectors (AI/ML, Fintech, Cybersecurity, Healthcare, Climate Tech, etc.) with full metadata (name, domain, sector, stage, hq_country, employee_count, founded_year, description)
- Add funding rounds for all new companies AND fill gaps for the 53 existing companies missing rounds
- Add financial records for all new companies (at least 1 period each)
- Add 15+ new investors and link them to companies via investor_company
- Normalize all `hq_country` values to consistent 2-letter ISO codes (US, GB, DE, FR, etc.) across all 200+ companies
- Add 30+ fresh activity events dated Jan-Feb 2026 so the dashboard shows current data

### 2. Polish the Landing Page

The current landing page is functional but reads like a template. For the "show your dad" version:

- Change "Laurenzo's" branding to "Laurenzo" consistently across Landing, Auth, and Sidebar
- Add a live stats bar below the hero: "200+ Companies | 14 Sectors | $X00B+ Deal Value Tracked" -- pulled from real DB counts
- Add a "Trusted by analysts at leading firms" social proof section (even if placeholder)
- Add a subtle animated gradient or visual flourish to the hero to make it feel more premium
- Improve the footer with proper links (Privacy, Terms placeholders)

### 3. Fix Data Quality Issues

- Normalize hq_country: "United States" -> "US", "United Kingdom" -> "GB", "Australia" -> "AU", "Germany" -> "DE", "France" -> "FR", "Canada" -> "CA", "Colombia" -> "CO", "Netherlands" -> "NL", "Sweden" -> "SE"
- This fixes the screening filters showing duplicate countries

### 4. Landing Page Stat Counter

Add a section that queries real data to show:
- Total companies tracked
- Total sectors covered  
- Aggregate deal value
- Number of investors

This gives the landing page credibility and shows real depth.

### 5. Branding Consistency

Update "Laurenzo's" to "Laurenzo" in:
- `Landing.tsx` (nav and footer)
- `AppSidebar.tsx` (logo text)
- `Auth.tsx` (title)
- `Index.tsx` (onboarding card welcome text)

## Technical Details

### Database Operations (via insert tool, not migrations)

**Normalize country codes:**
```sql
UPDATE companies SET hq_country = 'US' WHERE hq_country = 'United States';
UPDATE companies SET hq_country = 'GB' WHERE hq_country = 'United Kingdom';
UPDATE companies SET hq_country = 'AU' WHERE hq_country = 'Australia';
UPDATE companies SET hq_country = 'DE' WHERE hq_country = 'Germany';
UPDATE companies SET hq_country = 'FR' WHERE hq_country = 'France';
UPDATE companies SET hq_country = 'CA' WHERE hq_country = 'Canada';
UPDATE companies SET hq_country = 'CO' WHERE hq_country = 'Colombia';
UPDATE companies SET hq_country = 'NL' WHERE hq_country = 'Netherlands';
UPDATE companies SET hq_country = 'SE' WHERE hq_country = 'Sweden';
```

**Insert 55+ new companies** spanning: AI/ML, Fintech, Healthcare, Climate Tech, Cybersecurity, Infrastructure, Developer Tools, Consumer, Defense Tech, EdTech, Logistics. Companies like: Wiz, Mistral (already exists -- will check), Notion, Figma, Vercel, Railway, Replit, Hugging Face, Coda, Webflow, Ramp, Mercury, Deel, Rippling, etc.

**Insert funding rounds** for all new companies and backfill the 53 companies currently missing rounds.

**Insert financials** for all new companies.

**Insert 15+ investors** (Greylock, Index Ventures, Ribbit Capital, IVP, Spark Capital, etc.) and create investor_company links.

**Insert 30+ activity events** with dates in Jan-Feb 2026.

### File Changes

| File | Change |
|---|---|
| `src/pages/Landing.tsx` | Add stats section with real DB data, improve hero visuals, fix branding to "Laurenzo", add social proof placeholder, improve footer |
| `src/components/AppSidebar.tsx` | "Laurenzo's" -> "Laurenzo" |
| `src/pages/Auth.tsx` | "Laurenzo's" -> "Laurenzo" |
| `src/pages/Index.tsx` | "Laurenzo's" -> "Laurenzo" in onboarding card |

### New Companies List (55+)

Wiz, Notion, Figma, Vercel, Railway, Replit, Hugging Face, Coda, Webflow, Ramp, Mercury, Deel, Rippling, Abridge, Ro Health, Olive AI, Carbon Health, Arcadia, Redwood Materials, Watershed, Persefoni, Form Energy, Nuro, Shield AI, Rebellion Defence, Coursera, Duolingo (if not present), Guild Education, Masterclass, Kong, Postman (if not present), CircleCI, LaunchDarkly, Harness, Neon, PlanetScale, Cockroach Labs (if not present), SingleStore, Stytch, WorkOS, Clerk, 1Password (if not present), Arctic Wolf, SentinelOne, Tanium, Abnormal Security, Material Security, Faire, Goat Group, Fanatics, Instacart, Samsara, project44 (check if exists), KeepTruckin, Convex, Turso.

