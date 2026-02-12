

## Fixes and Improvements Based on Documentation Findings

### Issues Found

**1. CRITICAL: Pricing inconsistency ($299 vs $399)**
The pricing card on the Landing page (line 268) shows `$299` and Settings page (line 191) shows `$299/mo`, while the hero text and UpgradePrompt correctly show `$399/mo`. These must all be `$399`.

**2. CRITICAL: Usage tracking tier bypass is broken**
In `useUsageTracking.ts` (line 34), the code checks for `tier === "pro" || tier === "enterprise"` to skip usage limits. But new users are seeded with `tier: "professional"` (in `useAuth.tsx` line 80). This means **no paying user ever bypasses the limit check** — every Professional subscriber hits the daily counter unnecessarily. Fix: add `"professional"` to the bypass check.

**3. Missing route for /discover**
The sidebar links to `/discover` but `App.tsx` has no route for the `Discover` page component. Users clicking "Discover" in the sidebar get a 404. Fix: add the route.

**4. Sidebar has unused Discover import path**
The `Discover.tsx` page exists but is never imported in `App.tsx`.

---

### Changes

#### File 1: `src/pages/Landing.tsx`
- Line 268: Change `$299` to `$399` in the pricing card

#### File 2: `src/pages/Settings.tsx`
- Line 191: Change `Professional — $299/mo` to `Professional — $399/mo`

#### File 3: `src/hooks/useUsageTracking.ts`
- Line 34: Change the tier check from `"pro" || "enterprise"` to include `"professional"`:
```typescript
if (tier?.tier === "professional" || tier?.tier === "pro" || tier?.tier === "enterprise") {
```

#### File 4: `src/App.tsx`
- Add import for `Discover` page
- Add route `<Route path="/discover" element={<Discover />} />` inside the protected layout

