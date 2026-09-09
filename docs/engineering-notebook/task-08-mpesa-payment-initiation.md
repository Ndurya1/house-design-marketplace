# Task 08 — M-Pesa payment initiation

## Problem

Orders had immutable totals but no authorization for guest payment requests, no
durable payment-attempt records, and no protection against duplicate STK dispatch.
The installed Daraja client's HTTP calls had no explicit timeouts.

## What was missing or needed updating

Scoped checkout tokens, persistent/idempotent initiation, serialized reservation
per order, timeout-aware HTTP handling, safe provider outcomes, and configuration
that keeps real initiation off until callback processing is available.

## Implementation

- Order creation returns a signed payment-purpose checkout_token bound to the
  order UUID, valid for 30 minutes. It is not stored or returned by read serializers.
  Creation and payment responses use Cache-Control: no-store.
- POST /api/payments/ accepts only order_reference and idempotency_key (UUIDs).
  Guests send X-Checkout-Token; the owning authenticated buyer may use JWT instead.
  Designer/admin read permissions alone do not authorize initiation.
- The frontend helper accepts the checkout token and reuses caller-provided
  idempotency keys. With a checkout token it omits an unrelated stored JWT, avoiding
  failures caused by an expired login. CORS allows the checkout header.
- PaymentAttempt snapshots amount/phone and stores reference, status, idempotency
  key, safe error code, provider IDs, and timestamps. Admin access is read-only.
- A unique order/key pair handles retries; a partial unique constraint allows only
  one initiating, pending, or unknown attempt per order.
- The service uses a durable transaction to lock the order, authorize the request,
  return an existing attempt or reserve a new one, and commit before HTTP calls.
- Only non-legacy pending KES orders with known positive whole-shilling totals and
  normalized Kenyan phone numbers are payable. No amount/phone is taken from the
  initiation payload, and fractional amounts are rejected instead of rounded.
- DarajaGateway uses fixed sandbox/production hosts, PayBill STK payloads, explicit
  OAuth/STK timeouts, and no redirects or automatic retries. Payload structure follows
  the installed django-daraja 1.3.0 client; requests 2.33.1 is now a direct dependency.
- Accepted initiation with both provider IDs becomes pending; it does not complete
  the order. Explicit rejection or OAuth failure before dispatch becomes rejected.
  Ambiguous dispatch, malformed responses, and unexpected gateway failures become
  unknown. Unknown/initiating/pending attempts block another initiation.
- Initiation responses update only a still-initiating attempt, so later callback or
  reconciliation states cannot be overwritten. Provider-ID collisions become unknown.
- PAYMENT_INITIATION_ENABLED defaults to false. Callback URL and timeout configuration
  must validate before a new attempt is reserved. No live STK request was sent.

## Files modified

- backend/plan/orders/checkout_tokens.py, views.py, tests.py, test_migrations.py
- backend/plan/payments/models.py, gateway.py, services.py, serializers.py, views.py, urls.py, admin.py, tests.py
- backend/plan/payments/migrations/0001_initial.py
- backend/plan/plan/settings.py
- backend/.env.example, requirements.txt, README.md
- frontend/PlanClient/src/api/index.js, orders.js
- milestones.md and this notebook

## Request flow

Create order -> signed checkout token in receipt -> POST payment request with token
or owning buyer JWT -> validate input -> lock order and authorize -> reuse existing
attempt or validate order/configuration -> reserve initiating attempt -> commit ->
OAuth -> STK dispatch -> conditional outcome update -> safe attempt response.

Concurrent retry with same key -> existing attempt; no additional HTTP call.
Different key while active/unresolved -> 409. Explicitly rejected attempt -> new
key allowed. Same rejected key still returns the original attempt.

## Verification

- All 82 backend tests passed against PostgreSQL in 74.342 seconds.
- PAYMENT_INITIATION_ENABLED was confirmed false in the local runtime.

- Gateway tests mock HTTP for accepted/rejected/malformed responses, OAuth failures,
  dispatch timeouts, fixed hosts, payload amount/phone, timeout values, and redirects.
- Authorization tests cover expired/altered/wrong-purpose/wrong-order tokens, owning
  buyer access, and denied unrelated buyer/designer/admin access without a token.
- Tests cover forbidden payload fields, fractional/legacy/non-pending orders,
  disabled/misconfigured initiation, duplicate keys, active-attempt constraints,
  provider-ID collisions, advanced-state preservation, receipt tokens, and CORS.
- A PostgreSQL concurrency test pauses dispatch after reservation, verifies the
  gateway runs outside a transaction, observes the committed attempt from another
  connection, and proves same/different-key requests do not dispatch again.
- The legacy-order migration test also runs with the new dependent payment migration.
- Local payments.0001 migration applied; Django checks and migration consistency pass.
- Frontend production build passed. No checkout UI or live provider transaction was exercised.

## Key lessons

A provider accepting initiation is not evidence of payment. A timeout is not
evidence of rejection. Persist uncertainty and reconcile it before allowing a retry.

Idempotency and authorization solve different problems: an existing attempt must
still be authorized before its result is returned. An order UUID identifies a
record, while a scoped signed token grants temporary payment access.

Commit the reservation before external I/O. Database locks protect the decision
to dispatch, but should not remain held while waiting for the provider.

## Future considerations

- Task 9 adds callbacks, reconciliation, payment confirmation, and download grants.
  Keep initiation disabled until a real HTTPS callback handler is deployed and verified.
- Stalled initiating and unknown attempts intentionally remain blocked; do not
  reset them or resend automatically. They need provider reconciliation.
- OAuth failures are retryable with a new key because no STK request was dispatched.
- A crash after provider acceptance but before saving its IDs can require operational
  reconciliation. Callback arrival before initiation response is not yet implemented.
- Expired guest tokens have no refresh/recovery endpoint yet. Do not expose tokens
  in URLs, logs, analytics, or seller/admin order representations.
- Currency/whole-shilling validation is implemented; merchant/provider transaction
  limits and abuse controls need configuration before enabling real payments.
- HTTP mocks verify this integration contract, not live merchant credentials,
  provider availability, callback reachability, or end-to-end settlement.
