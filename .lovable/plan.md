

# Founder Mode: Next Moves to Make This a Real Business

This plan focuses on the 5 moves that separate "impressive demo" from "revenue-generating product." Ordered by business impact.

---

## Move 1: Lock the Front Door (Auth Gate)

The most critical gap. Every route is publicly accessible. The Auth page and ProtectedRoute component both exist but are completely disconnected.

**What to do:**
- Add `/auth` route to App.tsx
- Wrap the AppLayout route with ProtectedRoute so all dashboard pages require login
- Add a "Sign Out" button to Settings page and sidebar bottom
- Keep Landing page (`/`) public and unauthenticated

**Why it matters:** Without this, there's no user identity, no usage tracking, no conversion funnel, and no data isolation. Nothing else works without auth.

---

## Move 2: Onboarding Funnel (Landing to Signup to Dashboard)

Right now "Start Free Trial" and "Enter Platform" dump users straight to the dashboard with no signup. This means zero lead capture.

**What to do:**
- Change all Landing page CTAs ("Start Free Trial", "Enter Platform") to route to `/auth` instead of `/dashboard`
- On the Auth page, after signup show a brief "Welcome" step before redirecting to dashboard
- Wire the EarlyAccessModal to actually save submissions to a `waitlist_signups` table instead of faking it with setTimeout
- Create a `waitlist_signups` table (name, email, firm, title, interest, created_at)

**Why it matters:** Every visitor who clicks a CTA should become a lead or a user. Right now they become neither.

---

## Move 3: Consistent Pricing and Plan Enforcement

The Landing page shows $499/$1,499/$3,999 tiers. The UpgradePrompt modal shows $0/$99/Custom tiers. The subscription_tiers table just stores "free" with no enforcement beyond AI query limits.

**What to do:**
- Align the UpgradePrompt tiers to match Landing page pricing ($499 Analyst / $1,499 Professional / $3,999 Institutional)
- Update feature lists in UpgradePrompt to match Landing page features
- Keep all CTAs as "Contact Us" / mailto for now (no Stripe needed yet -- this is a sales-led product at these price points)
- Add a "Current Plan" display card to the Settings profile tab showing the user's tier

**Why it matters:** Inconsistent pricing destroys credibility in demos. Sales-led products at $499+/mo don't need self-serve checkout -- they need consistent messaging.

---

## Move 4: Waitlist That Actually Works

The EarlyAccessModal pretends to save data. For a sales-led product, every lead matters.

**What to do:**
- Create a `waitlist_signups` table (name, email, firm, title, interest, created_at) with RLS allowing inserts from authenticated and anonymous users
- Update EarlyAccessModal to insert into this table
- Add a simple admin view in Settings (for admin role users) showing waitlist signups count

**Why it matters:** If someone fills out a form expressing interest, that's a warm lead. Throwing it away is unacceptable.

---

## Move 5: Mobile Polish Pass

The remaining Phase 3D items that were planned but not yet executed.

**What to do:**
- Distressed Assets page: wrap filter pills in a collapsible panel on mobile
- Real Estate tabs: ensure horizontal scroll works on tab triggers
- Fund Intelligence table: add overflow-x-auto and sticky first column
- Landing page pricing cards: verify they stack properly on small screens
- Dashboard metric card labels: use text-xs on mobile to prevent text overflow

**Why it matters:** Wealthy individuals and family office principals often browse on iPads and phones. A broken mobile experience kills credibility.

---

## Technical Summary

### Database migrations:
1. Create `waitlist_signups` table with public insert RLS policy

### Files to modify:
1. `src/App.tsx` -- Add `/auth` route, wrap AppLayout with ProtectedRoute
2. `src/components/AppSidebar.tsx` -- Add Sign Out button at bottom
3. `src/pages/Landing.tsx` -- Change CTA links from `/dashboard` to `/auth`
4. `src/components/UpgradePrompt.tsx` -- Align tiers to $499/$1,499/$3,999
5. `src/components/EarlyAccessModal.tsx` -- Wire to database insert
6. `src/pages/Settings.tsx` -- Add current plan card and sign-out button
7. `src/pages/DistressedAssets.tsx` -- Mobile collapsible filters
8. `src/pages/FundIntelligence.tsx` -- Sticky first column on mobile
9. `src/pages/RealEstateIntel.tsx` -- Tab scroll on mobile

### No new components needed
### 1 database migration (waitlist_signups)
### Priority: Moves 1-2 first (auth + funnel), then 3-4 (pricing + waitlist), then 5 (polish)

