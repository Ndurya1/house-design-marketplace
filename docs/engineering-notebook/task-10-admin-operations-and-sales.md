# Task 10 — Admin operations and sales

## Problem

Marketplace operators needed a browser interface for reviewing plans, suspending
designers, and tracing sales through payment evidence. Django admin existed, but
ordinary status editing could bypass the API's publication checks.

## What was missing or needed updating

Shared review rules, explicit admin actions, protected PDF inspection, consistent
public availability, recorded operator actions, and connected read-only order and
payment views.

## Implementation

- `catalogue.services.review_listing` locks and re-reads the listing, checks the
  operator and permitted transition, validates publication prerequisites and an
  active designer, then saves the transition and an admin history entry within
  one transaction. Both API actions and Django admin call it.
- Listing status is read-only in admin forms. Non-draft listing content is also
  read-only. Review actions process each selected listing separately and report
  failures without claiming every selected record succeeded.
- A session-protected admin PDF endpoint checks the model view permission and
  streams an attachment with private/no-store headers. It never exposes a public
  storage URL.
- Suspension/reactivation locks an ordinary designer account and records changes
  to `is_active`. It rejects staff accounts and non-operators. Normal operators
  need Django's User change permission and cannot edit privilege fields. User
  deletion is disabled in this admin interface.
- Public listing/detail/related queries now require an active category and active
  designer. New order creation also checks the category; designer activity was
  already checked. Reactivation restores visibility without rewriting listing
  review status. This intentionally supersedes Task 6's old category-deactivation
  visibility behavior.
- Orders show read-only item snapshots and link to payment attempts. Attempts
  link back to orders and matching callback evidence; searches and date filters
  support investigation. No manual payment-state editing was added.

## Files modified

- Added `backend/plan/catalogue/services.py`, `users/operations.py`, and
  `catalogue/test_operations.py`.
- Updated catalogue views/admin/public-catalogue tests, users admin, orders
  services/admin, and payments admin/fulfilment tests.
- Updated `backend/README.md`, this notebook, and the milestone status after
  verification.

## Request flow

An operator logs into Django admin, inspects an in-review plan and downloads its
PDF, then selects a review action. Django checks model permissions; the shared
service validates the business rules and commits both status and operator history.
Public catalogue requests apply availability filters. New order creation checks
eligibility again before taking immutable price and file snapshots.

## Verification

- Full PostgreSQL suite: **112 tests passed**, using
  `python manage.py test users catalogue orders payments --noinput` from
  `backend/plan` with the project's virtual environment.
- Django system checks pass; `makemigrations --check --dry-run` reports no model
  changes, so this task needs no migration.
- Coverage includes admin publication/history, incomplete and repeat publication,
  operator restrictions, suspension/reactivation, existing-token rejection,
  inactive-category visibility and new-order rejection, preserved order snapshots,
  protected PDF review, and staff-account suspension rejection.
- A fulfilment regression confirms paid downloads survive suspension, order and
  payment admin pages render their navigation links, callback filtering works,
  and a POST cannot rewrite payment status through admin.
- The first PostgreSQL run exposed an outdated category-visibility expectation
  and a test-client cleanup issue: directly closing a streaming response closed
  the test transaction's connection. The test now consumes the response through
  the client wrapper, matching the existing download tests.
- Payment tests mock provider calls. No real STK push, production account change,
  or live browser walkthrough was performed.

## Key lessons

Admin is another application entry point: it must enforce the same business rules
as the API. A shared service prevents those rules from drifting. Read-only
financial history helps operators investigate without bypassing payment
verification. Suspension changes future availability without rewriting a buyer's
existing purchase.

## Future considerations

- Existing orders, including pending ones, retain their original payment and
  fulfilment flow. Refunds, cancellation, and audited download revocation or
  restoration need their own explicit business rules.
- Availability is checked at request time. An already-running checkout can overlap
  suspension or category deactivation; no cross-resource locking guarantee was
  added. Listing transitions themselves lock the listing row.
- Django history records operator actions but privileged database edits can bypass
  application history. Provision staff permissions carefully.
- Payment reconciliation scheduling, real provider rehearsal, receipts, and the
  previously noted frontend lint issues remain later roadmap work.
