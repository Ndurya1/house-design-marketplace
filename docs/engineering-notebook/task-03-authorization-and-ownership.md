# Task 03 — Authorization and ownership

## Problem

Orders were entirely unsecured, allowing any user (authenticated or guest) to read, update, or delete any order in the system, leaking designer sales figures and customer details. Additionally, admin panel models were completely unregistered, preventing admins from using Django's interface to review marketplace data.

## Previous implementation

- `OrdersViewSet` did not define permissions, allowing public access.
- `OrdersViewSet` queried all order records without filtering.
- Standard order details endpoint returned a `NameError` due to missing `PaymentsSerializer`.
- Django admin interface did not register `User`, `Buyer`, `SellerProfile`, `Catalogue`, `Orders`, or `payments` models.

## Why it was insufficient

It violated fundamental privacy guidelines by leaking customer transaction records and sales histories. Standard users could manipulate orders, and the administration panel was empty.

## New implementation

- Implemented `IsOrderOwnerOrAdmin` permission class:
  - Allowed public POST requests for guest orders.
  - Allowed GET list/details for authenticated creators (buyers), product sellers (designers), or admins.
  - Restricted PUT, PATCH, and DELETE exclusively to administrators.
- Overrode `get_queryset()` on `OrdersViewSet` to filter transactions based on roles at the database layer using `select_related` to optimize performance.
- Defined and imported `PaymentsSerializer` to resolve name crashes.
- Registered all models (`User`, `Buyer`, `SellerProfile`, `Catalogue`, `Orders`, and `payments`) in their respective `admin.py` modules.

## Files modified

- `backend/plan/orders/permissions.py` (NEW)
- `backend/plan/orders/views.py`
- `backend/plan/orders/serializers.py`
- `backend/plan/orders/tests.py`
- `backend/plan/users/admin.py`
- `backend/plan/catalogue/admin.py`
- `backend/plan/orders/admin.py`
- `milestones.md`

## Request flow

```text
Request (GET /api/orders/) with Authorization Header
  -> OrdersViewSet calls get_permissions()
  -> IsOrderOwnerOrAdmin checks: Authenticated? Yes.
  -> get_queryset() filters rows by role: Seller -> products sold by seller
  -> Database filters orders using SELECT JOIN
  -> Serializer formats rows into JSON
  -> View returns HTTP 200 Response
```

## Architectural lessons

- Limit queries at the database boundary (`get_queryset`) before relying on object-level permission checkers to protect performance and prevent database enumeration.
- Enforce strict write-prevention (immutability) on transactional objects like Orders to ensure data integrity.
- Keep admin management interfaces organized from day one to support operational visibility.

## Django concepts learned

- Custom permissions inherit from `BasePermission` and override `has_permission` (request level) and `has_object_permission` (object level).
- Views override `get_queryset()` to filter visible data dynamically.
- `select_related` optimizes database access by performing a SQL JOIN, eliminating N+1 query counts.
- `admin.ModelAdmin` controls lists, search fields, and filtering options inside Django's administration portal.

## Future considerations

- Integrate status updates securely via payment callbacks (Milestone 3).
- Implement read-only fields on order models to lock transactions permanently once finalized.
