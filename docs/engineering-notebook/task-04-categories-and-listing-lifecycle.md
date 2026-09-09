# Task 04 — Categories and listing lifecycle

## Problem

Catalogue categories were free-text values supplied by sellers, and every
listing was publicly visible immediately after creation. The marketplace had no
way to curate categories or distinguish an unfinished listing from a reviewed,
public plan.

## What was missing or needed updating

- A canonical category table managed by administrators.
- A relationship from each listing to an approved category.
- Lifecycle states and transition rules for a listing.
- Database-level visibility rules that hide non-published listings from the
  public.
- Tests that represent the new category relationship.

## Implementation

- Added `Category` with a name, group, and `is_active` flag.
- Replaced `Catalogue.category` and `Catalogue.category_group` text fields with
  a protected foreign key to `Category`.
- Added `draft`, `in_review`, and `published` listing statuses. New listings
  default to `draft`.
- Added a public read/admin write `CategoryViewSet` at `/api/categories/`.
- Added listing transition endpoints:
  - `POST /api/catalogue/{id}/submit/` for the owning seller.
  - `POST /api/catalogue/{id}/publish/` for an administrator.
  - `POST /api/catalogue/{id}/return-to-draft/` for an administrator.
- Limited anonymous catalogue queries to published records. Sellers can also
  view their own listings at any status; administrators can view all records.
- Used `PROTECT` for category deletion. An in-use category must be deactivated
  instead of deleted, preserving historical listing data.
- The data migration converts existing text categories into `Category` records.
  Rows with an invalid or missing legacy group are preserved as `other`.

## Files modified

- `backend/plan/catalogue/models.py`
- `backend/plan/catalogue/migrations/0004_category_catalogue_status.py`
- `backend/plan/catalogue/serializers.py`
- `backend/plan/catalogue/views.py`
- `backend/plan/catalogue/permissions.py`
- `backend/plan/catalogue/urls.py`
- `backend/plan/catalogue/admin.py`
- `backend/plan/catalogue/tests.py`
- `backend/plan/orders/tests.py`
- `milestones.md`

## Request flow

```text
Seller submits a draft
  -> POST /api/catalogue/{id}/submit/
  -> IsAuthenticated + IsSellerOwnerOrAdmin
  -> CatalogueViewSet.submit()
  -> verify seller ownership and draft status
  -> update Catalogue.status to in_review
  -> return serialized listing

Administrator publishes a listing
  -> POST /api/catalogue/{id}/publish/
  -> IsAuthenticated + IsSuperAdmin
  -> CatalogueViewSet.publish()
  -> verify in_review status
  -> update Catalogue.status to published
  -> public catalogue queryset can now return it
```

## Verification

- `python manage.py check` passed.
- `python manage.py makemigrations --check --dry-run` reported no model changes.
- Migration `catalogue.0004_category_catalogue_status` applied successfully to
  the local development database.
- `python manage.py test catalogue orders --keepdb --verbosity 1` passed:
  14 tests in 1.461 seconds.

## Key lessons

- A foreign key gives the database one authoritative category value; free-text
  fields cannot enforce that rule.
- Filtering visibility in `get_queryset()` prevents hidden records from being
  retrieved directly, not merely omitted from a user interface.
- A read-only serializer field is not enough for workflow control. Dedicated
  server-side actions enforce which actor can make each state transition.
- `PROTECT` is appropriate when deleting a lookup record would damage business
  history. Soft removal through `is_active` is safer.

## Future considerations

- Add review notes or a rejection reason so sellers know what to correct when a
  listing is returned to draft.
- Task 5 should add richer listing validation and file-upload rules.
- Task 6 can build search and filtering on top of the canonical category and
  published-only public queryset.
