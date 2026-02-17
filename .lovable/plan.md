

# Grapevine Production-Ready Audit and Fix Plan

## Product Definition

Grapevine is an AI-powered private market intelligence platform built for PE associates, family office analysts, and growth equity VPs. The core problem it solves is that investment teams waste hours daily across fragmented tools (Excel, email, PitchBook, news feeds) trying to source, evaluate, and track private company deals. The main workflow is: discover companies via screening/search, evaluate them with AI research and valuation tools, track promising ones through a deal pipeline, and stay informed via alerts and briefings. Success in the first session means a user has browsed companies, added at least one to their pipeline or watchlist, and seen the AI research capability in action. The platform differentiates with AI-generated memos, document analysis, deal matching, and full data provenance tracking.

---

## Priority Fix List

### P0 -- Critical (Blocks Core User Journeys)

| # | Issue | Detail |
|---|-------|--------|
| 1 | **No /reset-password page** | Password reset redirects to `/auth` which auto-logs the user in without letting them set a new password. A dedicated `/reset-password` route is required that checks for `type=recovery` in the URL hash and calls `supabase.auth.updateUser({ password })`. |
| 2 | **No Help/Contact/Support page** | There is no in-app help, FAQ, or contact page. The footer links to `mailto:contact@grapevine.io` and `#` placeholders. Users have no way to get support. Need a simple `/help` page with FAQ and a contact form. |
| 3 | **DisclaimerFooter has dead links** | LinkedIn href is `#`, Privacy Policy link goes nowhere (should go to `/privacy`). These are visible on every authenticated page. |
| 4 | **Landing page waitlist form -- no error feedback** | The `handleSubmit` catches errors silently (`console.error`). If the insert fails (e.g., missing table RLS, network error), the form still shows "You're on the list!" because `setSubmitted(true)` runs outside the try block. |
| 5 | **NotFound page has no back-to-app navigation** | Only links to `/` (landing). Logged-in users should be sent to `/dashboard`. The page also uses bare `<a>` instead of React Router `<Link>`. |

### P1 -- High (Broken or Misleading UX)

| # | Issue | Detail |
|---|-------|--------|
| 6 | **Password reset redirectTo is wrong** | `resetPasswordForEmail` redirects to `/auth` instead of a dedicated `/reset-password` page. |
| 7 | **Onboarding "Generate your AI briefing" step links to /dashboard** | This should link to the morning briefing section or settings/briefing, not just the dashboard where the user already is. |
| 8 | **Dashboard widget rendering -- hooks called inside map** | `WIDGET_COMPONENTS["companies-table"]` is a function component that calls `useNavigate()` inline. This creates a new component identity on every render, breaking React's rules of hooks. It should be extracted as a named component. |
| 9 | **No empty state for Dashboard when all widgets are hidden** | If a user hides all widgets via DashboardCustomizer, they see a blank page with just the hero header. Need a friendly "Your dashboard is empty -- click Customize to add widgets." |
| 10 | **Footer inconsistency** | Landing page has its own footer. Authenticated pages use `DisclaimerFooter`. The disclaimer footer has different links (dead LinkedIn, dead Privacy) than the landing footer (working Terms, Privacy, Data Coverage). |
| 11 | **Mobile: Deals kanban not scrollable hint** | On mobile, the kanban columns are hidden and replaced with cards, but there is no visual cue when deal list is empty per-stage on mobile. |

### P2 -- Polish (Professional Quality)

| # | Issue | Detail |
|---|-------|--------|
| 12 | **No loading state on Landing page waitlist submit** | The button shows "Joining..." but there is no spinner icon. |
| 13 | **Profile page has no avatar upload** | Settings shows email and display name but no profile picture capability. |
| 14 | **DashboardCustomizer drag-to-reorder has no visual feedback** | The reorder uses simple up/down buttons, not actual drag handles despite the plan mentioning them. This is acceptable but should be labeled clearly. |
| 15 | **Console warning: framer-motion deprecated props** | `motion.div` with `custom` and `variants` may trigger deprecation warnings in newer framer-motion versions. |
| 16 | **Accessibility: filter dropdowns use native `<select>`** | Companies page uses raw `<select>` elements without proper ARIA labeling. |
| 17 | **No keyboard shortcut help discoverability** | The `?` shortcut exists but is never mentioned in the UI. |

---

## Implementation Plan (Batched)

### Batch 1: P0 Fixes

**1. Create `/reset-password` page**
- New file: `src/pages/ResetPassword.tsx`
- Checks URL hash for `type=recovery`
- Shows password input with strength meter (reuse from Auth.tsx)
- Calls `supabase.auth.updateUser({ password })`
- Shows success message with link to `/dashboard`
- Add route in `App.tsx` as public route

**2. Fix password reset redirectTo in Auth.tsx**
- Change `redirectTo` from `${window.location.origin}/auth` to `${window.location.origin}/reset-password`

**3. Create `/help` page**
- New file: `src/pages/Help.tsx`
- FAQ section with accordion (common questions about the platform)
- Contact form that inserts into a new `support_requests` table
- Add route in `App.tsx` (accessible both logged in and logged out)
- Add "Help" link to sidebar bottom items and landing footer

**4. Fix DisclaimerFooter dead links**
- Privacy Policy link to `/privacy`
- LinkedIn link to a real URL or remove it
- Use React Router `Link` components instead of `<a href="#">`

**5. Fix Landing page waitlist error handling**
- Move `setSubmitted(true)` inside the try block, after the successful insert
- Show error toast on failure

**6. Fix NotFound page**
- Use React Router `Link`
- Conditionally link to `/dashboard` for authenticated users or `/` for guests
- Add "Go back" button using `navigate(-1)`

### Batch 2: P1 Fixes

**7. Extract CompaniesTableWidget as named component**
- Move the inline arrow function from `WIDGET_COMPONENTS["companies-table"]` to a proper named `const CompaniesTableWidget` component above the map

**8. Add empty state for fully-hidden dashboard**
- In `Index.tsx`, check if `fullWidgets.length === 0 && mainWidgets.length === 0 && sidebarWidgets.length === 0`
- Show a friendly empty state with a "Customize" button that triggers the customizer

**9. Fix DisclaimerFooter consistency**
- Add Terms, Data Coverage links
- Remove or fix LinkedIn placeholder
- Use `useNavigate` for internal links

**10. Add sidebar Help link**
- Add a Help/Support item to the bottom nav items in `AppSidebar.tsx`

### Batch 3: P2 Polish

**11. Landing page submit spinner**
- Add `Loader2` spinner to the waitlist submit button when loading

**12. Keyboard shortcut discoverability**
- Add a small "?" button in the header bar or sidebar footer

**13. Accessibility improvements**
- Add `aria-label` to filter selects on Companies page
- Add `aria-label` to icon-only buttons throughout

### Database Migration

Create `support_requests` table for the Help/Contact page:
```sql
CREATE TABLE public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create support requests"
  ON public.support_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own requests"
  ON public.support_requests FOR SELECT
  USING (auth.uid() = user_id);
```

### New Files
| File | Purpose |
|------|---------|
| `src/pages/ResetPassword.tsx` | Password reset form |
| `src/pages/Help.tsx` | FAQ + contact form |

### Modified Files
| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/reset-password` and `/help` routes |
| `src/pages/Auth.tsx` | Fix resetPasswordForEmail redirectTo |
| `src/pages/Landing.tsx` | Fix waitlist error handling, add spinner, add Help footer link |
| `src/pages/NotFound.tsx` | Smart navigation, React Router Link |
| `src/pages/Index.tsx` | Extract CompaniesTableWidget, add empty dashboard state |
| `src/components/DisclaimerFooter.tsx` | Fix dead links, add Terms/Privacy/Help |
| `src/components/AppSidebar.tsx` | Add Help link to bottom nav |

### Release Checklist (Post-Implementation)
- [ ] Landing page: waitlist submit works, error shown on failure
- [ ] Sign up: creates account, redirects to dashboard
- [ ] Forgot password: sends email, reset link works on /reset-password
- [ ] Dashboard: loads with widgets, customize works, empty state shows
- [ ] Companies: filters, sort, pagination, click-through to detail
- [ ] Company detail: all tabs render, add to pipeline works
- [ ] Deals: kanban drag works, remove deal works, workspace opens
- [ ] Research: all 4 tabs (chat, memo, documents, history) load correctly from Quick Actions
- [ ] Alerts: create, view, delete alerts; notifications render
- [ ] Settings: profile save works, all tabs render
- [ ] Help page: FAQ renders, contact form submits
- [ ] /reset-password: form renders, password updates
- [ ] NotFound: renders with correct back link
- [ ] Footer: all links work (Privacy, Terms, Help, Data Coverage)
- [ ] Mobile: sidebar opens/closes, pages are responsive
- [ ] No console errors on any page
- [ ] No broken network requests

