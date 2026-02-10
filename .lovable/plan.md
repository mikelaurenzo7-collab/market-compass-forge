

# Strategic Assessment and Next Steps

## Where We Stand

### Data Foundation
- **1,000 companies** tracked (530 private, 470 public)
- **608 funding rounds**, **1,062 financial records**, **58 investors**
- **0 news articles** -- the news table exists but has no data, which means the News & Sentiment features across the app are rendering empty

### Feature Completeness Scorecard

| Feature | Status | Revenue Impact |
|---|---|---|
| Dashboard with cross-market metrics | Done | Retention |
| Company intelligence (detail, scoring, provenance) | Done | Core value |
| Screening with filters + market toggle | Done | Core value |
| Deal pipeline (Kanban + tasks) | Done | Workflow lock-in |
| Portfolio tracker with P&L | Done | High retention |
| Comp table builder | Done | Analyst time-saver |
| AI research chat | Done | Differentiator |
| Investment memo generator | Done | Differentiator |
| Daily briefing email (Resend) | Done (needs domain config) | Retention loop |
| Alerts system | Done | Engagement |
| Watchlist manager | Done | Engagement |
| Usage-based soft paywall | Done (email-based upsell only) | Conversion blocker |
| News & sentiment feed | Built but **empty** | Dead feature |
| Stripe payments | **Not built** | No revenue |
| Onboarding / activation flow | Basic (3-step card on dashboard) | Low conversion |
| PDF/rich export | **Not built** (CSV + print only) | Missing table stakes |

### Critical Gaps (Ranked by Revenue Impact)

1. **No payment system** -- Users hit the upgrade prompt and see "Contact Us" via email. No self-serve checkout means zero conversion.
2. **Empty news feed** -- The most visible feature (on dashboard, company detail) shows nothing. This undermines trust.
3. **No first-run activation** -- New signups land on a dashboard with zero personal data. No guided setup to create a watchlist, add a pipeline deal, or explore AI research.
4. **Briefing email uses placeholder domain** -- `briefing@updates.lovable.app` will likely bounce or land in spam.
5. **No PDF export for memos** -- Analysts need to hand memos to partners. Text-file export looks amateur.

---

## The Plan: 4 High-Leverage Moves

### Phase 1: Stripe Integration (Revenue Unlock)

Enable Stripe and wire up self-serve checkout so the upgrade prompt actually converts.

- Enable Stripe connector
- Create three products/prices: Free ($0), Pro ($99/mo), Enterprise (custom/contact)
- Add a checkout flow triggered from the existing `UpgradePrompt` component
- On successful payment, update the `subscription_tiers` table to `pro`
- Gate AI research, memo generation, and enrichment behind the real tier check (already wired in `useUsageTracking`)
- Add a "Manage Subscription" section to Settings with billing portal link

### Phase 2: Seed News Data (Trust Builder)

Populate the `news_articles` table so the news features actually work across the platform.

- Update the `fetch-news` edge function to pull and summarize recent news for tracked companies using AI
- Run an initial batch to seed 50-100 articles with sentiment scores
- This immediately activates: Dashboard news widget, Company Detail "News & Sentiment" tab, Daily Briefing "Market Sentiment" section

### Phase 3: First-Run Onboarding Flow (Activation)

Guide new users through 3 steps so they see value immediately.

- Show a welcome modal on first login (check if user has zero pipeline deals + zero watchlists)
- Step 1: Pick 3 sectors of interest, auto-create a watchlist from top companies
- Step 2: Quick tour highlighting AI Research (type a question), Screening (apply a filter), and Deal Flow (add a company)
- Step 3: Prompt to enable Daily Briefing
- Store onboarding completion in the `profiles` table (add `onboarding_completed` column)

### Phase 4: PDF Memo Export (Polish)

Replace the plain-text memo export with a formatted PDF that looks institutional-grade.

- Use browser-based PDF generation (html2canvas + jsPDF or a simple print-to-PDF approach)
- Style the memo with the Grapevine brand header, formatted sections, and data tables
- Add a "Download PDF" button alongside the existing export on the Investment Memo tab

---

## Execution Order

```text
Phase 1: Stripe --> immediate revenue potential
Phase 2: News seed --> fixes biggest trust gap
Phase 3: Onboarding --> converts signups into active users
Phase 4: PDF export --> polishes the professional feel
```

## Technical Notes

- **Stripe**: Requires enabling the Stripe connector, which will prompt for a secret key. The existing `subscription_tiers` table already tracks user tiers -- Stripe webhooks will update it on payment events.
- **News seeding**: The `fetch-news` edge function exists but needs to be invoked with real company IDs. Will use Lovable AI (Gemini) to generate summaries and sentiment scores from company context.
- **Onboarding**: New `onboarding_completed` boolean column on `profiles` table. No new tables needed.
- **PDF export**: Client-side only, no backend changes. Will add `jspdf` and `html2canvas` as dependencies.
- **Briefing domain**: Still pending your verified Resend domain to replace `briefing@updates.lovable.app`.

