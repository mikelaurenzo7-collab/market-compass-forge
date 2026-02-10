

# Public Landing Page

## Overview
Create a new `Landing.tsx` page visible to unauthenticated visitors at `/`. Authenticated users hitting `/` will see the existing dashboard. The landing page will have a dark-theme hero section, feature overview grid, pricing summary, and prominent Sign Up / Sign In CTAs -- all consistent with the existing design system.

## Routing Changes

**`src/App.tsx`:**
- Add a new `<Route path="/" element={<Landing />} />` **outside** the `ProtectedRoute` wrapper
- Move the authenticated dashboard to `/dashboard`
- Update `ProtectedRoute` and `Auth.tsx` redirects to point to `/dashboard`

Alternatively (simpler): Keep `/` as the landing page for everyone, move the dashboard route to `/dashboard`, and update the `ProtectedRoute` default redirect.

## New File

**`src/pages/Landing.tsx`** -- A single-page marketing layout with:

1. **Nav bar** -- Logo + "Sign In" / "Get Started" buttons linking to `/auth`
2. **Hero section** -- Headline ("AI-Powered Deal Intelligence for Emerging Managers"), subheadline explaining the value prop, and two CTAs: "Get Started Free" and "Request Demo" (mailto link)
3. **Feature grid** (3 columns on desktop, stacked on mobile) -- 6 feature cards:
   - AI Research Chat
   - Investment Memo Generator
   - Deal Pipeline (Kanban)
   - Company Screening & Comparison
   - Real-Time Alerts
   - Data Provenance & Confidence Scoring
4. **Pricing section** -- Free / Pro / Enterprise cards matching existing tier structure from `UpgradePrompt.tsx`
5. **Footer** -- Disclaimer text (reuse `DisclaimerFooter` content) + copyright

## File Changes Summary

| File | Change |
|---|---|
| `src/pages/Landing.tsx` | New file -- full landing page component |
| `src/App.tsx` | Add `/` route for `Landing`, move dashboard to `/dashboard`, update protected route structure |
| `src/pages/Auth.tsx` | Change redirect from `/` to `/dashboard` |
| `src/hooks/useAuth.tsx` | No change needed (auth logic stays the same) |
| `src/components/AppSidebar.tsx` | Update any logo/home link to `/dashboard` |

## Technical Details

- The landing page will use the existing Tailwind design tokens (dark theme, primary cyan, Inter font)
- No new dependencies needed -- pure React + Tailwind + lucide-react icons
- The page is fully static with no data fetching, so it loads instantly
- Responsive: hero stacks vertically on mobile, feature grid goes to 1-column, pricing cards stack
- The `Landing` component checks `useAuth()` -- if user is already logged in, it redirects to `/dashboard` via `useEffect` (same pattern as Auth page)
- All internal links from sidebar, onboarding card, etc. that point to `/` will be updated to `/dashboard`

