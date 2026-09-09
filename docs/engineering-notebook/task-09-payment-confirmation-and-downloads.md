# Task 09 — Payment confirmation and secure download fulfilment

## Problem

An accepted STK request was only pending. The application could neither verify
payment completion nor give a guest access to the exact PDF they bought.

## What was missing or needed updating

Durable callback evidence, provider reconciliation, immutable purchased files,
transactional download grants, scoped guest access, and a checkout/status page.

## Implementation

- Order creation locks and validates published plans, creates price/title/seller
  snapshots, and copies each PDF into private `order_files/` storage with its
  SHA-256 digest. Ordinary snapshot edits are blocked. Copy/database failures
  roll back order rows and remove successfully tracked copies. The storage path
  now follows changes to the configured private root without a stale location cache.
- `OrderFileSnapshot` has one row per order item. No migration guesses historical
  file contents: old orders without reliable snapshots cannot initiate payment.
  Existing payment attempts can still be confirmed, but missing snapshots do not
  silently become today's files or free downloads.
- The callback parser caps input at 16 KiB and rejects duplicate JSON keys,
  malformed structure, duplicate metadata names, and invalid success metadata.
  Metadata is read by name, not array position. A canonical fingerprint deduplicates
  equivalent events, including reordered metadata. Durable receipt is acknowledged
  before any provider query; receipt alone grants no access.
- `reconcile_payments --limit 100` retries received, unmatched and unresolved
  callbacks. New events precede already checked ones, preventing an unresolved
  backlog from starving new payments. Early callbacks wait for initiation to save
  the provider identifiers; unknown identifiers never create payment attempts.
- Daraja's authenticated STK query uses fixed provider hosts, explicit timeouts,
  no redirects, and the stored checkout/merchant identifiers. Network work runs
  outside database locks. Unknown or malformed results remain unresolved.
  The request shape follows the official [Safaricom SDK query implementation](https://github.com/safaricom/mpesa-php-sdk/blob/master/src/Mpesa.php).
  Live response compatibility has not been exercised here.
- A successful query confirms checkout status. Amount, phone, receipt and date
  remain callback-sourced; the query does not independently return/verify all of
  them. The callback amount/phone must match the stored attempt, and receipt
  numbers are unique across attempts. Contradictory evidence remains held.
- Reconciliation locks order, attempt and event, rechecks state, and atomically
  records success, completes the order and creates one `DownloadGrant` per snapshot.
  Concurrent duplicate processing produces one grant. Verified failures release
  the active-attempt constraint; uncertain outcomes do not allow another charge.
  A late failure never downgrades a completed payment.
- Checkout creation returns a separate signed session credential (24 hours),
  alongside the existing 30-minute payment credential. A session or owning buyer
  authorizes status reads and issuance of a 10-minute grant-specific download token.
  Different signing salts/purposes prevent token substitution. No read serializer
  leaks or renews creation credentials.
- Download requests require that token or the owning buyer, a live grant and a
  completed successful payment. Files are opened and their digest checked before
  streaming a private, non-cached PDF attachment. Revocation works even for an
  already issued token. Missing/corrupt storage returns unavailable while preserving
  paid status; restoring the original bytes restores availability.
- React checkout collects contacts, creates the order, saves credentials and the
  payment retry key in sessionStorage, and waits for an explicit payment click.
  Uncertain initiation retries keep their key. A verified failure permits a fresh
  key. The status poll reads only the local database; downloads use headers and
  temporary blob URLs, never credential-bearing URLs.

## Files modified

- `backend/plan/orders/`: models, services, views, checkout tokens, fulfilment API,
  URLs, read-only admin, migration 0003, and order test fixtures.
- `backend/plan/payments/`: attempt/event models, callback service/parser/route,
  gateway query, initiation validation, admin, migration 0002, reconciliation
  management command, and payment/fulfilment tests.
- `backend/plan/catalogue/storage.py`, `backend/plan/plan/settings.py`, environment
  example and `backend/README.md`: private root handling, scoped token/CORS settings
  and operating instructions.
- `frontend/PlanClient/src/`: checkout page/routes, plan purchase link and API helpers.
- This notebook and `milestones.md`.

## Request flow

1. Buyer opens a plan and submits contact details. Order creation snapshots its
   price and private PDF and returns scoped credentials.
2. Explicit payment initiation reserves a durable attempt and requests STK Push.
3. Daraja's callback is validated and stored. The reconciliation command queries
   the known checkout; matching evidence completes payment/order and grants access.
4. Checkout polling sees paid state. The buyer requests a grant token and downloads
   the preserved PDF through an authorized API endpoint.

## Verification

- Full PostgreSQL-backed backend suite: 100 tests passed. After the final worker
  ordering change, all 19 fulfilment tests passed, including its new regression.
- Coverage includes callback duplication/reordering, concurrent reconciliation,
  early callbacks, amount/phone/merchant mismatch, unavailable or contradictory
  queries, conflicting receipts, late failures, failure/retry, scoped/expired
  credentials, owning-buyer access, unpaid/revoked grants, missing/corrupt files,
  original files surviving catalogue replacement/deletion, and copy rollback.
- Query tests mock HTTP and verify stored identifier matching, timeouts, ambiguous
  results and network failure. All payment tests mock provider access; no real
  STK request or financial transaction was made.
- Both local migrations applied. Django checks pass; no missing model migrations.
  Runtime `PAYMENT_INITIATION_ENABLED` is still False.
- Targeted ESLint passes for checkout, API helper and routes. The final Vite
  production build passed with `RAYON_NUM_THREADS=1` and Node
  `--max-old-space-size=512`, after the default parallel build hit the machine
  memory limit. The system npm launcher is broken locally, so the installed Vite
  and ESLint Node entrypoints were used directly. No browser/provider end-to-end
  payment rehearsal was performed.

## Key lessons

A webhook acknowledgement means evidence was saved, not that an order is paid.
Idempotency needs both application state checks and database uniqueness, because
simultaneous workers can read the same pending state. Keep slow provider requests
outside locks, then recheck before committing the business result.

Database transactions cannot roll back filesystem writes. Explicit cleanup handles
ordinary failures; separate storage backup and orphan cleanup are still necessary.
A purchased file is its own snapshot, not a pointer to a mutable catalogue upload.
Payment state and delivery availability are separate facts: a broken download must
not trigger a second payment.

## Future considerations

- Deploy HTTPS callback routing and schedule/monitor the reconciliation command
  before enabling payment. The command is supplied, but no recurring scheduler was
  installed. Run an explicitly authorized provider rehearsal and verify actual
  query response contracts before launch.
- Add audited operator resolution for conflicting evidence, initiation without
  provider IDs, lost callbacks and missing historical files. Do not fabricate a
  receipt, file snapshot or successful state to clear an exception.
- Add guest recovery/email delivery, bounded reconciliation backoff, retention and
  endpoint abuse controls in the operations/hardening work. A lost/expired guest
  session currently needs support; a session does not extend payment-token expiry.
- Add audited grant revocation/restoration controls; the persisted revocation field
  is enforced now while admin history remains read-only.
- Clean up abandoned order copies and crash-created orphan files with explicit
  retention rules. Back up database and private storage together. Ordinary cleanup
  cannot cover a process crash or a partial storage write before a name is returned.
- Direct privileged database/filesystem edits bypass application immutability;
  use restricted operator access. Local hashing on download trades I/O for integrity;
  object-storage versioning and signed delivery can follow if volume requires it.
