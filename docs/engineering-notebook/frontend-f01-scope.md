# F01 — Launch scope and data contracts

## Problem

The UI advertises more destinations and capabilities than it currently implements.

## What was missing or needed updating

A screen-to-API map, reporting definitions and a distinction between existing backend capabilities and missing business/data contracts.

## Implementation

Created `docs/frontend-scope.md`. Recorded explicit approval of whole-KES prices and Revenue terminology; defined seller-scoped reports and proposed destination paths. Tracked unanswered business inputs without inventing policy terms.

## Files modified

- `docs/frontend-scope.md`
- `frontend-milestones.md`
- This notebook entry.

## Request flow

React requests an endpoint; the Django view scopes records to the caller; the serializer determines the fields available to the screen. Seller orders already expose only the seller's item snapshots and subtotal. A frontend screen must work within that contract, not assume access to every database field.

## Verification

Read serializers, routes, order view scoping and client API helpers. Documentation-only work; no application tests needed and no claim of newly functioning pages. F01 business inputs remain pending.

## Key lessons

Gross revenue is not a payout balance. Historical prices come from order snapshots. A new page does not necessarily require a new endpoint, but a new field or workflow may require backend work.

## Future considerations

Proceed with F02's concrete UI patch under the project review workflow. Resolve business identity/support, policy content and missing metadata/recovery contracts in their assigned tasks. Whole-KES enforcement still belongs to F07.
