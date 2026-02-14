

# What's Next for Grapevine: Product Evaluation and Roadmap

## What's Already Shipped

| Area | Status |
|------|--------|
| 5-step onboarding flow | Done |
| Cinematic sparklines + ticker tape | Done |
| AI Copilot (floating assistant) | Done |
| Compare mode (Cmd+Shift+C) | Done |
| Live sector multiples + dynamic DCF | Done |
| Portfolio analytics (CAPM-based WACC) | Done |
| Investor Metrics page (/metrics) | Done |
| Usage meters on dashboard | Done |
| Ambient grid + glassmorphism + tilt cards | Done |
| Landing page with waitlist | Done |

## What's Missing (Prioritized)

### Tier 1: Activation and Retention (High Impact, Low Effort)

**1. Auto-Generate Morning Briefing on First Login**
Currently the briefing requires a manual button click. After onboarding completes, automatically trigger the `morning-briefing` edge function so users see an "aha moment" immediately.
- Files: `OnboardingFlow.tsx`, `Index.tsx`

**2. Empty State Redesign**
Replace generic "No deals yet" messages with contextual CTAs that guide users to Screening, Deal Matcher, or Companies. Each empty state should link to the most relevant next action.
- Files: `EmptyState.tsx`, `Deals.tsx`, `Portfolio.tsx`

**3. Quick-Start Templates on Companies Page**
Add pre-built filter presets like "Top AI/ML Companies", "Series B+ Growth", "Distressed Opportunities" that instantly populate the table so first-time users never see an empty screen.
- Files: `Companies.tsx`, `Screening.tsx`

### Tier 2: Monetization and Conversion (High Impact, Medium Effort)

**4. Free Tier Definition and Upgrade Prompts**
Define explicit free-tier limits (5 screens, 10 AI queries/month, 5 memos/month) and show an `UpgradePrompt` component when users approach or exceed limits. Color-code usage meters (green/yellow/red) at 75%/90%/100%.
- Files: `UsageMeters.tsx`, `UpgradePrompt.tsx`, new usage enforcement hook

**5. "What's New" Changelog Modal**
Show a modal on login when new features have shipped. Archive past entries. Drives feature discovery and re-engagement.
- Files: new `WhatsNewModal.tsx` (already exists but may need wiring), `AppLayout.tsx`

### Tier 3: Investor Confidence and Polish (Medium Impact)

**6. Data Coverage Transparency**
Add a "Data Coverage: X% with financials" badge to the Companies page header. Allow filtering to "companies with financials only." Show per-sector coverage breakdown.
- Files: `Companies.tsx`, `CompanyTable.tsx`

**7. Landing Page Social Proof**
Add real platform stats to the landing page (7,800+ companies, 350+ distressed assets, etc.) and a "Trusted by emerging fund managers" section. Show data source logos (SEC EDGAR, FRED).
- Files: `Landing.tsx`

**8. Mobile Responsiveness Pass**
The dashboard, deal kanban, and company table need responsive breakpoint adjustments. Target 1-column on mobile, 2-column on tablet.
- Files: `Index.tsx`, `Deals.tsx`, `CompanyTable.tsx`, `AppLayout.tsx`

### Tier 4: Power User Delight

**9. Email Briefing Preview and Send Test**
Surface the briefing email preview flow more prominently. Add a "Send Test Email" CTA from the dashboard briefing widget, not just buried in Settings.
- Files: `MorningBriefing.tsx`, `BriefingSettings.tsx`

**10. Keyboard Shortcut Discovery**
Add a `?` shortcut that opens a keyboard shortcut cheat sheet overlay, showing all available hotkeys (Cmd+K, Cmd+Shift+C, Cmd+J, etc.).
- Files: new `KeyboardShortcuts.tsx` (already exists), `AppLayout.tsx`

## Recommended Implementation Order

```text
Phase 1 (Quick Wins)
  [1] Auto-generate briefing on first login
  [2] Empty state redesign with contextual CTAs
  [3] Quick-start templates on Companies page

Phase 2 (Monetization)
  [4] Free tier limits + upgrade prompts
  [5] What's New modal

Phase 3 (Polish)
  [6] Data coverage badge
  [7] Landing page social proof
  [8] Mobile responsiveness

Phase 4 (Delight)
  [9] Email briefing preview
  [10] Keyboard shortcut overlay
```

## Technical Notes

- Items 1-3 are primarily UI/UX changes with no database migrations needed
- Item 4 requires wiring the existing `UpgradePrompt` and `UsageMeters` components together with threshold logic
- The `/metrics` route exists but is commented out of public routes in `App.tsx` (line 87) -- it's accessible via sidebar navigation but not formally routed. This should be re-enabled or kept as an internal tool
- The `WhatsNewModal.tsx` component already exists in the codebase and just needs to be integrated into `AppLayout.tsx` with a version-check trigger

