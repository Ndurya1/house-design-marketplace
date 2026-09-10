# F02 — Feedback and confirmation proposal

Status: implementation present and verified on 10 September 2026. The user approved the browser-check and documentation update in the resumed session. See the [verification notebook](../../engineering-notebook/frontend-f02-feedback.md). The original implementation proposal remains in [f02-feedback.patch](f02-feedback.patch) and `proposed/src/`.

## Scope and request flow

- New `components/ui/feedback.jsx`: consistent loading, empty and error panels, descriptive text and optional action. Icons are decorative; status/error text is announced. Retry remains outside the live region.
- New `components/ui/confirm-dialog.jsx`: native modal dialog, labelled title/description, initial Cancel focus, background scroll lock, pending action guards, inline error, and focus restoration. Escape cancels before a request, but cannot pretend to cancel an in-flight deletion. The native modal keeps the background inert. Buttons use guarded `aria-disabled` during requests so keyboard focus remains in the dialog.
- Updated `pages/DashboardOverview.jsx`: use feedback panels for the design list; distinguish failed fetch from empty results; retry only that endpoint. Replace delete confirm/alert with the shared dialog; label edit/delete icons. Render an unavailable design metric on failure. Other overview metrics remain F05 work.

Flow: click a draft's named Delete button → review dialog → confirm → existing `deletePlan` API helper → backend ownership/lifecycle enforcement → remove item only after success. On failure retain the item and dialog. On cancellation restore trigger focus; on successful removal restore focus to the My Designs heading. Use a functional list update so unrelated updates are preserved.

## Review considerations

The loading request uses cleanup to ignore results after unmount/retry. Dialog requests are guarded immediately with a ref as well as parent busy state, preventing duplicate clicks before React rerenders. No network request is made simply by opening the dialog. No server/API/schema changes are proposed.

Native `dialog.showModal()` avoids adding a focus-trap dependency. Runtime behavior still requires browser validation. Existing create/edit and authentication dialogs are not replaced by this patch. Future integrations should provide their own labels and errors through the shared props.

## Verification

All three proposed JSX files pass the project's ESLint configuration: zero errors and zero warnings. The initial external-file lint invocation ignored the files; it was replaced with an explicit proposal working directory, and all three files were actually checked. A cleanup-ref warning found in that check was corrected before generating the final patch.

Application lint, all five existing tests and production build passed. The updated `browser-check.cjs` passed at 320px and 1440px with synthetic API records: loading, empty, failed load/retry, Cancel/Escape, Tab/Shift+Tab modal cycles, blocked background focus, pending double-click protection, deletion failure/retry, successful removal/focus fallback, scroll unlock and no dialog horizontal overflow. See [results](evidence/results.json). Chrome can report BODY while focus visits browser chrome; the test allows this while requiring an open modal and excluding background page controls. F02b's scoped integration is verified; full visual and screen-reader acceptance is not claimed. F02 remains in progress.
