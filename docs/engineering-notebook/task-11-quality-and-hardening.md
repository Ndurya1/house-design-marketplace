# Task 11 — Quality and hardening

## Problem

Six frontend lint errors remained, API validation errors could display as
`[object Object]`, profile updates could target the wrong identifier, cancelled
orders could look payable, and buyers lacked a printable payment receipt.

## What was missing or needed updating

Readable failure messages, reliable identity and route-state handling, explicit
non-payable checkout states, a protected receipt derived from purchase snapshots,
and regression coverage for these behaviors.

## Implementation

- Moved price formatting into a utility, removed unused component-helper exports
  and an unused import. Prices retain up to four decimal places and missing values
  display as unavailable instead of zero.
- Browse and detail pages use a keyed content component. A changed route/query
  creates fresh loading state; cleanup aborts the previous request. This avoids
  resetting state synchronously inside effects and showing the previous plan
  while its replacement loads.
- API errors flatten nested field/list validation messages, give useful fallback
  messages for empty/non-JSON errors, and avoid showing server failure details.
  Network messages advise checking payment status before retrying. Abort errors
  retain their cancellation behavior; malformed successful JSON gets a readable
  error. Payment retry/idempotency behavior remains unchanged.
- SellerProfileSerializer exposes its read-only profile ID. Both profile editors
  now use that ID directly rather than falling back to the user ID.
- Checkout explicitly reports cancelled orders and completed orders without
  verified payment evidence. Neither state enables the payment button.
- The receipt endpoint authorizes the checkout session or owning buyer, requires
  a completed order and confirmed payment with receipt/date evidence, and returns
  saved order-item titles/designer names/prices plus payment references. Catalogue
  edits/deletion cannot rewrite receipt contents. Responses are private/no-store.
- The frontend receipt page displays the confirmed purchase and provides the
  browser's print/save-to-PDF action. Navigation and print controls are hidden in
  print output. Tokens are sent in headers, never URLs or printed content.

## Files modified

- Backend: users serializer and new profile-ID tests; orders fulfilment, URLs,
  and new receipt endpoint; payment fulfilment regression tests.
- Frontend: App, checkout, browse/detail/profile/dashboard pages, API client and
  order helpers, PlanCard/register/button/badge components; new receipt page,
  error/price/session helpers, Node tests, and package test script.
- Backend README, this notebook, and milestone status after verification.

## Request flow

A confirmed checkout links to its receipt. React reads the existing session from
sessionStorage and sends it as a header. Django checks order ownership/session,
then verified payment. The response uses immutable purchase snapshots and stored
confirmation evidence. React renders those values; the browser handles printing.

## Verification

- Full PostgreSQL suite: **117 tests passed** across users, catalogue, orders, and
  payments. New coverage includes receipt access after verified payment only;
  missing, wrong-purpose, wrong-order, and expired session tokens; owning-buyer
  access and other-buyer denial; stable receipts after catalogue changes/deletion;
  cancelled/unverified-completed states; and divergent profile/user identifiers.
- All **5 Node tests passed** for nested validation errors, server-detail masking,
  fallback messages, payment-safe network guidance, and price precision.
- Full frontend ESLint passes with zero errors. Vite production build passes;
  it reported a plugin-timing advisory, not a build failure.
- Django system checks pass. Migration dry-run reports no changes.
- No real payment was initiated. Automated checks did not include a browser print
  preview or live provider/end-to-end rehearsal; those remain explicitly pending.

## Key lessons

A user and their profile are separate records with separate primary keys. A
receipt describes what was purchased at payment time, not today's catalogue.
An effect should synchronize a request with a component's identity; a new route
can create fresh state naturally through a key. Friendly errors must still
preserve important payment-retry guidance.

## Future considerations

- Email receipt delivery, expired-session recovery, and formal invoicing are
  separate follow-ups. Receipts currently use existing time-limited buyer access.
- Node tests cover error/price utilities; full browser navigation and print-layout
  rehearsal remain part of the deployment walkthrough.
- Deployment settings, HTTPS, backups, provider rehearsal, reconciliation
  scheduling, and environment-specific abuse controls remain launch work.
