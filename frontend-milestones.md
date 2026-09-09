# PlanSoko frontend milestones

The audit and roadmap are approved. F01 and F02 are in progress; subsequent tasks are planned. This is the frontend completion track from the [8 September audit](docs/frontend-audit.md), separate from existing backend task numbers/statuses in [milestones.md](milestones.md).

Use the workflow in `instructions.md`: assess and explain the task; present a concrete patch for approval; implement, verify, and document. The first approved F02 foundation patch is applied; see the task status and notebook for remaining scope. Record implementation evidence in `docs/engineering-notebook/` as each task completes.

## Milestone F1 — Scope and shared foundations

| Task | Outcome | Status |
| --- | --- | --- |
| F01. Confirm launch journeys and business/data contracts | [Screen/API contract and confirmed decisions](docs/frontend-scope.md); remaining business inputs tracked. | In progress |
| F02. Consolidate the UI system | [Foundation patch applied and verified](docs/engineering-notebook/frontend-f02-foundation.md); feedback/dialog states and remaining cleanup outstanding. | In progress |
| F03. Complete public and dashboard navigation | Working responsive navigation with real destinations and current-page state. | Planned |
| F04. Complete registration and session experience | Every seller entry point works; consistent authentication/recovery states. | Planned |

### F01 — Scope, route map, and contracts

Dependencies: none. Priority: P0 scope decision.

- Map buyer browse → detail → payment → receipt/download/support and designer register → profile → upload → review → sales.
- Agree routes for designs, orders, revenue, settings, policies, and help. Preserve Django admin for staff.
- Define gross revenue versus paid-out earnings, reporting periods/statuses, price precision, and launch product metadata.
- List operator/support details, licensing/refund/privacy inputs and unsupported claims. Mark each API dependency and optional feature explicitly.
- Acceptance: a reviewed screen/data matrix names existing endpoint fields, missing contracts, access boundaries, and business decisions. No screen depends on invented balances or unverifiable claims.

### F02 — UI tokens and reusable components

Dependencies: F01. Priority: P1, foundation for later tasks.

- Preserve blue/slate, Inter UI, Playfair editorial headings, and architectural imagery.
- Consolidate token definitions; repair invalid utilities and font-weight mismatches. Document type, color, spacing, radii, elevation, breakpoints and focus rules.
- Standardize buttons/fields/cards, status badges, dialogs, alerts, loading/empty/error states and formatting. Replace ad-hoc styles as related screens are completed.
- Acceptance: a reviewable component/state specimen demonstrates keyboard focus, disabled/loading/error variants and responsive rules; computed styles match intended tokens. Contrast is measured rather than assumed.

### F03 — Navigation and responsive shells

Dependencies: F01–F02. Priority: P0.

- Implement the public mobile menu; fix Contact and footer category links; provide policy/help navigation.
- Define real dashboard child routes and semantic links with current-route state. Implement destination screens in F05–F10; do not call F03 complete while shipped links remain placeholders.
- Let the shell control desktop/sidebar spacing; prevent mobile identity/navigation overlap and retain reachable settings/logout.
- Acceptance: all visible links reach the named destination; keyboard/back/forward/direct reload work; mobile navigation opens/closes and stays usable with long names. No `#` placeholder actions remain.

### F04 — Registration, authentication, and recovery

Dependencies: F02–F03; recovery API/email support if absent. Priority: P0 for signup, P1 for session/recovery.

- Connect `/signUp` to real registration or consolidate it with a shared working form. Ensure Sign Up selects registration and Log In selects login.
- Share authentication state; implement bounded refresh/retry and clean expiration/logout handling without retry loops. Retain backend permission enforcement.
- Provide labelled forms, field/API errors, pending states, accessible modal focus/escape behavior, and a defined password-recovery route/process.
- Acceptance: registration from Home/About/Header, duplicate/invalid submissions, login failure/success, expired token, failed refresh, logout and recovery are exercised. Recovery completion requires its server dependency, not a cosmetic form.

## Milestone F2 — Complete designer dashboard

| Task | Outcome | Status |
| --- | --- | --- |
| F05. Rebuild overview around useful summaries | Correct metrics, recent sales, status summaries and quick actions. | Planned |
| F06. Dedicated My Designs screens | Searchable designs with clear lifecycle and management destinations. | Planned |
| F07. Complete upload/edit/review experience | Reliable validation, exact prices and understandable submission states. | Planned |
| F08. Seller orders and order detail | Usable sales records with accurate historical values. | Planned |
| F09. Revenue reporting | Clearly defined gross revenue reports without fictional payout balances. | Planned |
| F10. Profile and settings | One complete profile view/editor and clear account settings scope. | Planned |

### F05 — Overview

Dependencies: F01–F04. Priority: P1.

- Render recent sales and a working view-all link; show appropriate design lifecycle counts and actions.
- Use real time filtering or label totals as all-time. Define completed-order count explicitly; distinguish loading, empty, error and partial failure per section.
- Keep detailed management in dedicated pages. Use immutable sale-item prices for revenue.
- Acceptance: fixtures with zero data, multiple statuses, older/current sales and individual endpoint failures produce correct labels/totals/states. A completed sale appears in recent sales.

### F06 — My Designs list and management destination

Dependencies: F03–F05. Priority: P1; required to finish P0 navigation.

- Create dedicated list/detail management routes with search/status filters and scalable pagination as supported by the API.
- Show thumbnail, title, price, category, file presence and lifecycle status; expose only permitted edit/delete/submit actions.
- Acceptance: empty, populated, loading/error and long-content screens work; direct links retain context; one seller cannot obtain another seller's private resources. Preserve current backend lifecycle rules.

### F07 — Upload, edit, and submit for review

Dependencies: F01, F02, F06. Priority: P0 price integrity; P1 workflow completion.

- Remove silent edit-price rounding; align displayed/accepted decimal precision with the approved payment rule. Preserve unchanged prices exactly.
- Consolidate create/edit fields with file/category validation, previews, pending/success/error feedback and accessible destructive confirmation.
- Explain draft/review/published states and blocked actions. Coordinate any rejection/review-reason fields with backend before promising them.
- Acceptance: unchanged-price save, invalid/fractional price policy, missing/invalid file, server rejection, edit restrictions, delete cancellation and submission transitions are exercised. Avoid accidental double submissions.

### F08 — Orders and order details

Dependencies: F01–F04, F06. Priority: P1.

- Add seller order list/detail screens using the seller-scoped contract. Display reference, date, status, purchased design and historical amount; add supported filtering/pagination.
- Only display buyer information actually authorized and necessary for the seller. Do not expose guest credentials, private payment internals or other sellers' items.
- Acceptance: correct ownership, multi-item historical values, empty/error states and direct navigation are verified. Add API work if current fields cannot support the agreed detail view.

### F09 — Revenue reporting

Dependencies: F01, F08. Priority: P1.

- Define date range, currency, eligible order statuses and total calculations; add a useful breakdown linked to source orders.
- Label gross sales revenue accurately. Rename Earnings if needed; commission, settlement and withdrawal functionality require a separately approved backend/accounting model.
- Acceptance: totals reconcile to immutable seller order items across date boundaries and statuses. Pagination cannot silently undercount totals. No made-up available balance or payout controls.

### F10 — Profile and account settings

Dependencies: F02–F04. Priority: P1.

- Replace raw database identifiers with a meaningful profile summary; centralize the duplicated editor.
- Implement reliable loading/failure/save states, avatar preview cleanup and fluid form widths. Align validation with backend rules.
- Define name/email/password changes and public profile visibility; add required APIs before presenting editable unsupported fields.
- Acceptance: load/save/failure/empty profile and avatar cases are verified; saved data remains after reload; no missing-property display, duplicate conflicting editor, or narrow-screen overlap.

## Milestone F3 — Buyer experience and business pages

| Task | Outcome | Status |
| --- | --- | --- |
| F11. Complete catalogue and plan information | Buyers can assess actual plan contents before paying. | Planned |
| F12. Finish checkout, receipt and download UX | Clear payment/access states linked to policies and support. | Planned |
| F13. Business policy pages | Approved privacy, terms, license, refund and designer information. | Planned |
| F14. Contact, help and order recovery | A real assistance route for buyer and seller problems. | Planned |
| F15. Align marketing with delivered features | Trustworthy, consistent content and functional calls to action. | Planned |

### F11 — Catalogue and plan detail completeness

Dependencies: F01–F03; metadata/preview backend changes as agreed. Priority: P1.

- Decide minimum useful architectural metadata (for example bedrooms, area, storeys and plot requirements), units, preview assets and file/package contents; implement matching API and seller input before displaying them.
- Add clear inclusions, license/support information, robust image fallbacks and consistent cards/details. Show approved designer information only.
- Acceptance: filters reflect real stored fields; missing metadata is honestly handled; previews do not expose protected paid PDFs. Saved plans, comparisons and messaging remain optional unless separately approved.

### F12 — Checkout, receipt and downloads

Dependencies: F01–F03, F11, F13–F14. Priority: P0 support/policy integration; P1 completeness.

- Review pending, completed, failed, cancelled, expired and interrupted-network experiences; make support and recovery reachable.
- Explain delivered files, amounts and access limitations. Add appropriate policy links and any agreed acknowledgement; persist acceptance only through an approved server contract.
- Acceptance: browser checks cover return/reload, retry and error states, authorized download, expired credentials and readable printed receipt. Preserve payment idempotency/reconciliation and credential-scoped access; never infer payment from a client success message.

### F13 — Privacy and business policies

Dependencies: F01 business inputs, F02–F03. Priority: P0.

- Add readable, directly addressable Privacy Policy, Terms of Use, Plan License, Refund/Dispute Policy and Designer Agreement pages; combine documents only where clearly appropriate.
- Collect actual operator/contact details, data purposes/processors/retention, license scope, refund/support process and designer obligations. Do not invent compliance, payout or refund guarantees.
- Acceptance: owner-approved content with effective dates is reachable from footer and relevant signup/purchase flows; layout/links work on mobile. Obtain appropriate review before publication. Any cookie controls must reflect technologies actually used.

### F14 — Help, contact and recovery

Dependencies: F01–F04; backend/email/support operations as needed. Priority: P0 usable support; P1 self-service recovery.

- Provide a real contact destination and marketplace FAQs for payment problems, downloads, licensing and designer review.
- Agree and build secure guest-order recovery, or document the actual supported assistance process until self-service is ready. Password recovery belongs to F04.
- Acceptance: advertised channels work; a form, if chosen, actually delivers requests with feedback. Recovery verifies entitlement, avoids leaking order data, and is tested for expired/invalid requests. No decorative submit buttons or unsupported response-time promises.

### F15 — Marketing content and consistency

Dependencies: F01, F03–F04, F11, F13–F14. Priority: P0 unsupported claims.

- Reconcile Home/About claims about verification, comparisons, messaging, plan previews and direct payouts with implemented scope.
- Substantiate testimonials, inventory/audience numbers and credentials or remove them. Replace irrelevant construction/regulatory FAQs with approved marketplace help.
- Acceptance: every feature promise maps to a working journey or is removed; all CTAs work; terminology, brand, currency and spelling are consistent across public and dashboard pages.

## Milestone F4 — Frontend acceptance and launch gate

| Task | Outcome | Status |
| --- | --- | --- |
| F16. Browser, responsive and accessibility acceptance | Verified launch journeys and documented remaining limitations. | Planned |

### F16 — Acceptance

Dependencies: F01–F15 within agreed launch scope. Priority: P1 release gate; all P0 issues must be resolved.

- Exercise buyer and designer journeys with success, empty, loading, invalid, unauthorized, expired and server-error states. Use meaningful browser regression tests for registration, navigation, price preservation, order displays and checkout access.
- Review 320/390/768/1024/1440px layouts, long content, zoom, keyboard navigation, focus, accessible names, contrast, dialogs, touch controls and receipt printing. Include actual browser interactions rather than relying on lint/build.
- Run appropriate existing frontend checks and backend checks for changed contracts. Capture screenshots and results in the engineering notebook.
- Acceptance: no unexplained dead links or P0 findings; core flows pass; unresolved optional scope is explicit and absent from marketing. Coordinate final release with backend task 12's deployment/payment/backup-restore rehearsal; this task does not replace that rehearsal.

## Suggested execution order

Start with F01, then F02–F04 and F05–F10. Build F13–F14 before closing F12; complete F11–F15 and finish F16. Policy/business inputs can be gathered while dashboard work proceeds. The dependency order takes precedence over numerical order.
