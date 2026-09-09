# Task 07 — Guest order domain

## Problem

The order serializer accepted caller-controlled status, buyer, product, and amount.
Amount incorrectly referenced a catalogue record. Historical sales changed with
catalogue prices, and deleting related accounts/plans could erase orders.

## What was missing or needed updating

Guest contacts, immutable item snapshots, server-calculated decimal totals,
atomic creation, seller-specific reads, preservation of historical records, and
removal of generic order mutations and hard-coded STK Push demonstrations.

## Implementation

- Orders retain their database IDs and existing payment relationships. New fields
  include a unique UUID reference, guest email/phone, KES currency, total, and is_legacy.
- OrderItem snapshots the original plan ID, designer ID/name, title, and unit price.
  Live plan/designer references use SET_NULL; buyer deletion also uses SET_NULL.
- Items and retained payment-method records protect their parent order from deletion.
- Ordinary model saves reject snapshot changes; model deletes reject history deletion.
  API PUT/PATCH/DELETE and admin create/change/delete are unavailable. These guards
  do not prevent privileged bulk updates, bulk item deletion, or direct SQL.
- POST accepts only guest_email, guest_phone, and 1–20 distinct plan_ids. Unknown
  fields are rejected. Kenyan 07/01, 254, and +254 mobile formats normalize to +254.
- The creation service locks requested plan rows in ID order, validates published
  state, attached blueprint reference, positive price, and active seller account,
  then stores order and items in one transaction. Prices retain four decimal places.
- An authenticated buyer is associated through their account, never submitted
  buyer ID or matching email. A missing Buyer profile is created in the same
  transaction; invalid orders roll it back. Other callers create guest orders.
- The creation receipt returns the newly submitted order. Subsequent guest reads
  are denied: a UUID identifies an order but does not authorize access.
- Buyers read only linked orders. Administrators inspect full orders. Sellers
  receive only their own items/subtotal and no contacts or full multi-seller total.
  Payment-method reads are denied to sellers.
- The seller dashboard sums completed snapshot items and explicitly excludes
  historical items whose prices are unknown. It no longer looks up current plan prices.
- /api/payments/ returns 503 without calling Daraja. Duplicate demonstration code
  was removed; /api/ remains the catalogue API index.

## Files modified

- backend/plan/orders/models.py, services.py, serializers.py, permissions.py, views.py, admin.py
- backend/plan/orders/tests.py, test_migrations.py
- backend/plan/orders/migrations/0002_orderitem_remove_orders_amount_remove_orders_product_and_more.py
- backend/plan/payments/views.py, urls.py
- frontend/PlanClient/src/api/orders.js
- frontend/PlanClient/src/pages/SellerDashboard.jsx
- backend/README.md, milestones.md, and this notebook

## Request flow

Guest or authenticated user -> POST /api/orders/ -> explicit input/contact validation
-> authenticated buyer association if applicable -> transaction -> lock and validate
plans -> calculate total -> save order and snapshot items -> 201 creation receipt.

Authenticated read -> filter orders by account role -> prefetch only permitted
items -> full buyer/admin representation or restricted seller representation.
GET /api/orders/{reference}/ uses the UUID; numeric database IDs are no longer API lookups.

## Verification

- Migration test upgrades two legacy orders with an existing payment record,
  preserving IDs, statuses, timestamps, contacts, and relationships. References
  are unique; prices/totals remain NULL rather than copying current catalogue prices.
- Local migration applied successfully; there were zero existing development orders.
- System checks pass and makemigrations --check --dry-run reports no changes.
- Frontend production build passed.
- All 61 backend tests passed against PostgreSQL in 105.070 seconds.
- Tests exercise input tampering, contact/list validation, unavailable plans,
  transaction rollback, authenticated association, seller redaction, ownership,
  snapshot preservation after deletion, mutation guards, constraints, unknown legacy
  subtotals, and disabled payment demonstrations.

## Key lessons

A foreign key points to current data; a snapshot records what was ordered at a
specific time. Decimal totals belong on the server, not in client-provided fields.

Transactions keep parent/child creation consistent. Locking plans stabilizes their
prices during snapshot creation. Ordering locks by ID reduces deadlock opportunities.

Filtering which orders a seller can read is not enough for multi-seller orders:
the serialized items and totals must also be restricted to that seller.

## Future considerations

- Task 8 adds guest payment authorization, payment attempts, idempotent initiation,
  and M-Pesa amount rules. No guest read token, payment, or download is enabled here.
- Legacy totals are unknown and legacy statuses are not verified payment evidence.
  Exclude those orders from new payment initiation until explicitly reconciled.
- Back up before upgrading a populated installation. Downgrading populated snapshots
  is unsupported; restore a backup. The reverse helper permits empty test databases only.
- Legacy title/designer/contact metadata is best-effort current data at migration time.
- Blueprint availability checks the attached reference; immutable purchased file
  versions and storage existence/fulfilment rules belong to the download work.
- Public creation needs abuse controls and expiry/idempotency policies during hardening.
- Order lists remain unpaginated to preserve the existing seller dashboard contract.
