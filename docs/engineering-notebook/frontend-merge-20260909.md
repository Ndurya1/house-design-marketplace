# Frontend folder consolidation — 9 September 2026

## Problem

Today's homepage, header, footer and About changes were made in `C:/house_plan_marketplace` instead of the active workspace `C:/Users/Administrator/OneDrive/Desktop/Projects/house_plan_marketplace`.

## What was missing or needed updating

The other copy had newer presentation changes alongside older API/authentication integration. Whole-file replacement would regress category data handling and navigation.

## Implementation

Merged the four requested files only. Imported homepage layout/type/color/CTA styling, About presentation/content edits, full-width header and rounded account controls, and footer grid/branding. Kept current Home/Header category fetching, numeric IDs, unavailable-category messaging and keyboard handling; kept general Browse links targeting `/plans` and current safe stored-user initialization. Corrected incoming `p-8m` to `p-8` so mobile step spacing applies.

Both before/incoming versions, final diffs and a hash manifest are saved in `.consolidation-backup/20260909-215057/`. The other folder was not modified. The pending F02 feedback/dialog proposal remains unapplied; shared F02 foundation changes remain intact.

## Files modified

- `frontend/PlanClient/src/pages/HomePage.jsx`
- `frontend/PlanClient/src/pages/AboutPage.jsx`
- `frontend/PlanClient/src/components/Header.jsx`
- `frontend/PlanClient/src/components/Footer.jsx`
- This notebook and browser evidence in `docs/frontend-merge-20260909/`.

## Request flow

Categories still arrive as API objects and are grouped by category group in the header. Navigation uses numeric category IDs. Presentation from the other copy does not replace this contract with its obsolete grouped-string assumption.

## Verification

- Lint, all five existing tests, and final production build pass. Build reports only a plugin-timing warning.
- Synthetic-category browser checks pass: header selection navigates to `/plans/17`; Browse House Plans navigates to `/plans`.
- Home/About rendered at 1440, 390 and 320px with no page JavaScript errors or document horizontal overflow. Full-page screenshots and observations saved; no live accounts/payments changed.
- Hash comparison confirms all non-target frontend source files are unchanged, and all four source-folder originals remain unchanged.

## Key lessons

Merge presentation changes into the active API contract rather than overwriting files from a stale copy. Continue work in the active workspace path above.

## Future considerations

Continue the pending F02 review after this consolidation. Existing missing mobile-menu/contact behavior and unsupported marketing claims remain tracked in the frontend roadmap; this merge is not a completion of those tasks.
