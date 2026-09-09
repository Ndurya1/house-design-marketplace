# Task 02 — Designer authentication

## Problem

Public registration and login were unreliable and insecure. The browser could
submit a role, registration did not supply Django's required username, and the
frontend sent an uppercase role value that the model rejected.

## Previous implementation

- A generic user serializer accepted a client-controlled `role`.
- Public registration omitted `username`, while login expected it.
- A post-save signal created a seller profile for every user.
- The frontend exposed buyer/designer account selection despite the marketplace
  requirement that only designers have accounts.
- Two different login routes existed.

## Why it was insufficient

The client must never control privileges. Designers could not reliably register
and log in, and non-designers could receive a seller-domain profile.

## New implementation

- Public registration accepts only name, email, and password.
- The server normalizes the email, sets internal `username=email`, and forces
  the seller role.
- Django password validators run before a user is created.
- Seller profiles are created only for sellers.
- `/api/login/` accepts email/password and maps the email to the internal
  username before delegating authentication and token creation to SimpleJWT.
- Access tokens last 15 minutes and refresh tokens last 7 days.
- React no longer exposes account type or sends role/username values.
- The duplicate generic login endpoint was removed; `/api/login/` is the
  supported endpoint.

## Files modified

- `backend/plan/users/models.py`
- `backend/plan/users/serializers.py`
- `backend/plan/users/views.py`
- `backend/plan/users/tests.py`
- `backend/plan/plan/settings.py`
- `backend/plan/plan/urls.py`
- `frontend/PlanClient/src/components/AuthModal.jsx`
- `milestones.md`

## Request flow

```text
React signup: name, email, password
  -> POST /api/register/
  -> DesignerRegistrationSerializer validates and normalizes input
  -> User.objects.create_user() hashes password
  -> post_save signal creates SellerProfile

React login: email, password
  -> POST /api/login/
  -> CustomTokenObtainPairSerializer replaces its public email input
     with Django's internal username
  -> SimpleJWT authenticates and signs access/refresh tokens
  -> React stores tokens and designer identity
```

## Architectural lessons

- Authentication identifies a user; authorization decides their permitted
  actions. The server owns role assignment.
- Keep the public API ergonomic while adapting it to legacy/internal schema at
  a narrow boundary.
- Extend a framework at its documented or observed extension point instead of
  copying its authentication logic.
- Tests are part of the design process: failed tests exposed SimpleJWT's
  dynamically created username field.

## Django concepts learned

- `AbstractUser` supplies an internal username and secure password support.
- DRF serializers validate input and define a safe API contract.
- `create_user()` hashes passwords; `create()` does not.
- Django signals react to model lifecycle events such as `post_save`.
- SimpleJWT produces signed access and refresh tokens.
- `TestCase` uses an isolated temporary PostgreSQL database.

## Future considerations

- Add email verification and password-reset flows after the MVP core flow.
- Keep refresh-token revocation/blacklisting for a later security enhancement;
  it requires an additional app and a deliberate logout policy.
- Move JWT storage out of local storage if the frontend's XSS risk grows.
- Task 3 will enforce object-level permissions for profiles, plans, and orders.
