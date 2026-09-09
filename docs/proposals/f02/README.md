# F02 foundation — approved and applied

Applied after explicit user approval on 9 September 2026. The proposal below is retained as review history. See `../../engineering-notebook/frontend-f02-foundation.md` for verification and remaining scope. Do not rerun `prepare.py` to recreate this historical diff against the now-modified source.

This first F02 patch changes six existing application files. Review `f02-foundation.patch` for exact changes and `specimen.html` for a standalone visual sample compiled with the proposed Tailwind configuration and CSS. The specimen uses native HTML matching the proposed component classes; it is not a React integration test.

## Changes and reasoning

- `src/index.css`: remove unused unfinished tokens, keep the consumed HSL system, improve text/error/input contrast, introduce primary hover and explicit shape tokens, and add opt-in typography roles. Existing page headings are not globally restyled.
- `tailwind.config.js`: expose primary hover and control/dialog radii. Keep Tailwind's existing spacing scale; avoid duplicating it with disconnected variables.
- `src/components/ui/button.jsx`: 44px default/small/icon targets, 48px large controls, visible offset focus rings and coherent outline/primary hover colors. Preserve form-submit behavior and existing API.
- `src/components/ui/input.jsx`: 44px height, 16px text, stronger boundaries/focus and `aria-invalid` styling. Callers still supply label associations, validation and error descriptions.
- `src/components/ui/card.jsx`: semantic border, consistent 12px radius and explicit title size/line height.
- `src/components/ui/badge.jsx`: remove hover effects from passive status labels.

Existing caller classes can override shared defaults. Larger shared controls can affect header wrapping, so responsive checks are required after approval. The unused `asChild` implementation is unchanged in this styling patch; do not introduce usages of its span fallback as an interactive control.

## Verification so far

`prepare.py` reads source and writes proposed copies plus the patch; it never applies the changes. It also computes light-theme contrast from the exact proposed HSL values (`contrast.json`): primary/white 5.17, hover/white 6.71, muted text/white 7.58, destructive/white 4.83, input border/white 4.75. These sampled pairs are not a full accessibility certification, particularly for custom overrides or dark mode.

After approval: apply the reviewed patch, run frontend lint/tests/build, inspect rendered shared components and affected pages on desktop/mobile, and record results. F02 remains in progress until reusable feedback/dialog states, remaining font/utility cleanup and the full specimen acceptance checks are complete. This proposal does not mark the whole milestone finished.
