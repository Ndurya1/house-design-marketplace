# F02 — Shared UI foundation, first approved patch

Applied 9 September 2026 after explicit patch approval. F02 remains in progress.

## Problem

Shared controls had inconsistent sizing, focus, borders and tokens, making page-by-page completion harder to keep consistent.

## What was missing or needed updating

The stylesheet contained unused unfinished tokens alongside the active HSL system. Buttons/inputs defaulted to 36px height; cards and badges used inconsistent presentation.

## Implementation

Applied exactly the six-file reviewed proposal: removed unfinished tokens, added semantic primary hover and explicit radii, improved sampled light-theme contrasts, added opt-in type roles, standardized control sizing and focus, strengthened input/invalid styling, and removed passive badge hover effects. Caller-specific styles remain possible.

The unified diff initially failed against Windows line endings. Before writing any application file, normalized source-to-proposal diffs were checked against the approved patch for all six files. No unreviewed application changes were added.

## Files modified

- `frontend/PlanClient/src/index.css`
- `frontend/PlanClient/tailwind.config.js`
- `frontend/PlanClient/src/components/ui/button.jsx`
- `frontend/PlanClient/src/components/ui/input.jsx`
- `frontend/PlanClient/src/components/ui/card.jsx`
- `frontend/PlanClient/src/components/ui/badge.jsx`
- Roadmap/proposal status and this notebook entry.

## Request flow

No API or authorization flow changes. React components select classes; Tailwind resolves semantic colors/radii through CSS variables. Page callers still own labels, validation, submission and error descriptions. `aria-invalid` styles an invalid field; it does not validate data itself.

## Verification

- Frontend lint passed; all 5 existing helper tests passed; production build passed. Vite reported a plugin timing warning, not a build failure.
- Rendered home, about, browse, detail, signup, dashboard, profile and profile editor at 1440, 390 and 320px widths using synthetic API records. No page JavaScript errors in those samples. No real account/payment mutations.
- Saved 24 viewport captures and [observations](../proposals/f02/evidence/observations.json). Visually inspected desktop home, mobile catalogue and narrow profile editor.
- Actual React Apply filters button measured 44px height and 8px radius. Keyboard Tab/Shift+Tab gave `:focus-visible` with a 2px white offset and 2px blue ring.
- Proposed light-theme contrast measurements retained in `../proposals/f02/contrast.json`. These cover selected pairs, not a full accessibility audit.
- At 320px, the profile editor document measured 340px wide; bottom navigation overlaps identity. These confirm previously identified fixed-width/navigation risks, tracked in F10/F03. Other sampled document widths did not overflow. Full-page content, dark mode, screen readers and complete interactive journeys remain outside this check.

## Key lessons

Shared component changes improve defaults but do not automatically repair raw inputs or page-specific overrides. A successful build and zero runtime errors do not prove usable responsive layouts.

## Future considerations

Continue F02 with reusable loading/empty/error feedback, dialogs, remaining font/utility cleanup and full specimen acceptance. Complete navigation and profile layout in F03/F10. Keep this first approved patch distinct from completion of the entire UI milestone.
