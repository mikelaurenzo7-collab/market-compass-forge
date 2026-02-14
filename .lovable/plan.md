
# Grapevine: Investor-Ready & User-Ready Roadmap

## Current State Assessment

### **What's Working**
- **Data Infrastructure**: 7,844 companies, 1,032 financials seeded, 734 funding rounds, 12 active demo deals
- **AI Moats**: Morning Briefing, Deal Matcher, Alpha Signals, Investment Memo generation
- **Platform Architecture**: 5-group navigation, lazy-loaded dashboard, realtime updates, REST API
- **Auth & Security**: User authentication, RLS policies, JWT edge function protection
- **Monetization Baseline**: $599/month Professional tier, usage limits, API access tier

### **Critical Gaps (Blocking Investor & User Confidence)**

**1. Onboarding Leaks**
- Onboarding references `/watchlists` (renamed to `/screening` — broken link)
- 3-step flow is too minimal; doesn't showcase AI capabilities (briefing generation, memo creation)
- No "aha moment" — users land in empty dashboard with no context

**2. Missing Investor Metrics**
- No usage analytics dashboard (feature exists but it's in `/analytics`, not discoverable)
- No ARR tracking or revenue projection metrics
- No user retention/engagement metrics visible to founders
- Landing page claims "Now in Early Access" but no conversion/cohort data

**3. Data Quality Visibility**
- "Data Coverage" indicator missing on Companies page (only 1,032/7,844 have financials = 13%)
- No transparency on financial data confidence scores
- Users can't distinguish high-confidence from low-confidence metrics

**4. User Activation Bottlenecks**
- Empty state messaging is generic ("No deals yet") — should guide to screening/matching
- No "quick start" templates (e.g., "5 AI/ML companies to track", "Current distressed assets")
- Briefing generation is a manual button click — should auto-generate on first login
- No email preview/send test flow (exists but hidden in Settings > Briefing)

**5. Feature Discoverability**
- API Docs page exists but no in-app discovery (no "API" CTA on dashboard)
- Valuation Football Field component exists but only accessible via CompanyDetail
- No "Pro Tips" or feature discovery tooltips
- No "What's New" or changelog visible to users

**6. Mobile Experience**
- Dashboard is desktop-first; no responsive optimization for mobile usage
- Deal kanban isn't mobile-optimized
- Nav sidebar transitions are abrupt on mobile

**7. Free-to-Paid Conversion**
- No trial/free tier defined (everything requires login)
- No usage meter feedback (users hit limits silently)
- Pricing page exists but no clear value props tied to use cases
- No "Upgrade Required" CTAs when hitting limits

---

## Phase 2: Investor-Ready & User-Ready Implementation

### **Part A: User Activation & Onboarding (Days 1-3 of product experience)**

1. **Enhanced Onboarding Flow**
   - Expand from 3 to 5 steps:
     - Step 1: "Screen your first deal" (browse companies, save 1)
     - Step 2: "Create a watchlist" (group 5+ companies)
     - **NEW Step 3: "Generate your briefing"** (auto-generate morning briefing, preview format)
     - **NEW Step 4: "Write an investment memo"** (generate memo for 1 saved company)
     - Step 5: "Set up alerts" (choose sectors/stages)
   - Fix broken `/watchlists` → `/screening` link in onboarding
   - Add skip button, track completion %
   - Show "Congratulations" screen with next steps (settings, API key, etc.)

2. **Quick-Start Templates**
   - Pre-canned watchlists on Companies page: "Top 10 AI Picks", "Series B+ Growth", "Distressed Opportunities"
   - Auto-add these to user profile on first visit (optional toggle)
   - Load 10-20 companies instantly so dashboard isn't empty

3. **Auto-Generated Morning Briefing**
   - Trigger generation on first login after onboarding (not manual button)
   - Collapse/expand by default, show summary
   - Add "Send Test" CTA linked to email digest preferences
   - Store briefing timestamp for "as of" indicator

4. **Empty State Redesign**
   - Replace "No deals yet" with actionable CTAs
   - Pipeline empty state: "Browse 7,800+ companies or import your target list"
   - Watchlist empty state: "Use AI screening to build your first watchlist"
   - Link to relevant pages (Companies, Screening, Deal Matcher)

### **Part B: Investor Metrics & Credibility (Founder Dashboard)**

5. **Add Usage Analytics Tab to Settings**
   - Move existing `/analytics` insights into Settings > Usage
   - Display: monthly active users, API calls, memo generations, pipeline deals
   - Show trends (week-over-week growth, engagement heatmap)
   - Export as CSV for investor updates

6. **Data Coverage Transparency**
   - Add badge on Companies page: "Data Coverage: 13% with financials"
   - Show breakdown by sector (AI/ML: 85% coverage, Services: 2% coverage)
   - Allow filtering to "Companies with financials only"
   - Confidence score indicator (high/medium/low) on each company card

7. **Investor Dashboard (New `/metrics` route)**
   - Key metrics: ARR, user cohorts, retention rate, API usage
   - User growth chart (MoM %)
   - Feature adoption: % users generating briefings, memos, alerts
   - Data freshness indicator (last update to intelligence signals, public company data, distressed assets)
   - "Ready for demo" banner with key talking points

### **Part C: Feature Discoverability & Value Communication**

8. **In-App Feature Tooltips**
   - Onboarding overlay: "Tip: Try the AI Deal Matcher to find 10 similar companies"
   - Dashboard card: "Pro tip: Customize your briefing in Settings"
   - Companies table: "Keyboard shortcut: ⌘J to jump to company detail"
   - One-time tooltip on first visit to each major feature

9. **"What's New" Modal**
   - Show on login if new features added (e.g., "REST API now live!")
   - Link to `/developers` for API documentation
   - Archive view in Help/Support

10. **Mobile Responsiveness**
    - Responsive grid for dashboard (1 col mobile, 2 col tablet, 3 col desktop)
    - Mobile-optimized deal kanban with swipe navigation
    - Sidebar drawer transitions polished (already partially done)
    - Test on iPhone 14 / iPad

### **Part D: Free-to-Paid Conversion Funnel**

11. **Usage Meter Visibility & Warnings**
    - Show active usage meters on dashboard (AI Research: 5/200, Memo Gen: 12/100)
    - Color-coded warnings at 75%, 90%, 100% usage
    - "Upgrade to Professional" CTA when approaching limit
    - Grace period: notify 7 days before reset

12. **Free Tier Offer**
    - Define free tier: 5 saved screens, 10 AI research calls/month, 5 memos/month, 1 watchlist
    - Professional tier: Unlimited + API access + early data + email briefings ($599/mo)
    - Add "Free" badge to Settings > Plan
    - Show feature comparison on Plans page

13. **Conversion CTA Placement**
    - Upgrade prompt when trying to exceed free limits
    - "API Access (Pro)" badge on `/developers` page
    - "Try Premium" button in Intelligence Feed (competitive signals)
    - Email briefing setup → "Professional feature, upgrade to enable"

### **Part E: Metrics for Investor Confidence**

14. **Showcase Real Data**
    - Landing page: Show real stats (7,800 companies, 350 distressed assets, 98% uptime)
    - Dashboard: "Last updated 2 hours ago" → real freshness
    - Public Companies page: Show import progress (e.g., "3,200 / 7,000 companies updated today")
    - API docs: Show call stats (e.g., "API processed 50,000 calls today")

15. **Institutional Credibility**
    - Add "Trusted by emerging fund managers" testimonial section on landing
    - Show data sources prominently (SEC EDGAR, Firecrawl, FRED)
    - Add compliance/disclaimer footer ("All analysis for informational purposes only")
    - SOC 2 / GDPR badge (when applicable)

---

## Technical Implementation Map

| Feature | Files | Complexity | Why |
|---------|-------|------------|-----|
| Fix onboarding links & expand flow | `OnboardingFlow.tsx`, `useAuth.tsx` | Low | Route mismatch, immediate wins |
| Auto-generate briefing on first login | `useAuth.tsx`, `MorningBriefing.tsx` | Medium | Aha moment, user activation |
| Quick-start templates | `Companies.tsx`, `Screening.tsx`, new hook | Low | Data already exists, UX only |
| Data Coverage indicator | `Companies.tsx` | Low | SQL query + badge component |
| Usage Analytics tab | `Settings.tsx`, new `useAnalyticsData` | Medium | Aggregate existing queries |
| Investor Metrics page | New `/metrics` page, new queries | High | Custom dashboard, auth checks |
| Mobile responsiveness | `AppLayout.tsx`, dashboard components | Medium | Breakpoint tweaks + layout |
| Free tier enforcement | `UsageMeters.tsx`, `UpgradePrompt.tsx` | Medium | Existing components, wire together |
| Feature tooltips | New `useOnboardingTips` hook, components | Low | Library-based (Popover) |
| Data freshness display | `Index.tsx` dashboard, queries | Low | Timestamp logic |

---

## Expected Investor Impact

After implementation:
- **"Day 1 Aha"**: User opens app → sees populated dashboard with template companies → generates first briefing in 2 min
- **"Week 1 Activation"**: User creates own watchlist, generates memo, saves screening
- **"Month 1 Retention"**: Auto-generated briefings + alerts drive daily engagement
- **"Investor Confidence"**: Metrics dashboard shows growth, data freshness, user actions

---

## Sequence (Prioritized)

**Tier 1 (Days 1-2): Quick Wins — $100K+ impact**
1. Fix onboarding route links
2. Auto-generate briefing on first login
3. Quick-start templates (Companies page)
4. Data Coverage badge (Companies page)

**Tier 2 (Days 3-4): Investor Metrics**
5. Usage Analytics tab (Settings)
6. Investor Metrics dashboard (`/metrics`)
7. Mobile responsiveness polish

**Tier 3 (Days 5-6): Monetization & Discoverability**
8. Free tier limits + enforcement
9. Feature tooltips (optional, delight feature)
10. "What's New" modal
11. Email briefing preview/send test

---

## Why This Matters

**For Users**: First-time activation jumps from "browse empty dashboard" to "briefing generated" in <5 min. Retention improves because briefings + alerts create habit loops.

**For Investors**: Metrics dashboard shows traction (DAU, feature adoption, API usage). Data coverage transparency builds trust. Free tier creates funnel for conversion.

**For Founders**: Onboarding → activation → retention → monetization loop is now instrumented and visible.

