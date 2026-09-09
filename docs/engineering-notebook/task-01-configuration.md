# Task 01 — Configuration and local environment

## Problem

The backend claimed PostgreSQL, JWT, CORS, Daraja, and file uploads as part of
its stack, but its checked-in configuration still used SQLite and its dependency
file did not describe the installed runtime packages.

## Previous implementation

- `settings.py` hard-coded SQLite, `DEBUG=True`, and the M-Pesa sandbox.
- CORS middleware was installed without configured browser origins.
- `backend/.env` existed but had no committed safe template.
- `requirements.txt` listed only Django's base dependencies.

## Why it was insufficient

A new developer or deployment could not reproduce the environment. The React
app could not make cross-origin API requests, and developing on SQLite could
hide PostgreSQL-specific behavior until late in the release process.

## New implementation

- Settings explicitly load `backend/.env`.
- PostgreSQL connection details, hosts, CORS origins, debug mode, and M-Pesa
  environment are configured through environment variables.
- `.env.example` documents required variables without exposing secrets.
- `requirements.txt` records direct backend dependencies.
- A PostgreSQL database was created, connected, and migrated.
- `backend/README.md` documents reproducible local setup.

## Files modified

- `backend/requirements.txt`
- `backend/.env.example`
- `backend/.gitignore`
- `backend/plan/plan/settings.py`
- `backend/README.md`

## Request flow

```text
manage.py starts Django
  -> plan.settings explicitly loads backend/.env
  -> Django configures PostgreSQL, CORS, installed apps, and middleware
  -> React request reaches CorsMiddleware
  -> Django routes the request to an API view
  -> a model query uses PostgreSQL
  -> Django returns the response to the permitted React origin
```

## Architectural lessons

- Environment-specific values belong outside source code.
- A committed template documents configuration; a real secrets file must stay
  private.
- Development should use the same database engine as production when practical.
- Configuration is application-wide infrastructure, so it should be explicit,
  small, and documented.

## Django concepts learned

- Django settings are loaded during process startup.
- `DATABASES` configures Django's database connection backend.
- `migrate` applies version-controlled schema changes and records them in
  `django_migrations`.
- CORS is enforced by browsers and configured in Django through middleware and
  allowed origins.

## Future considerations

- Use `DEBUG=False`, real hosts, HTTPS, and production-specific credentials in
  deployment.
- Add separate settings modules only when environment differences become large
  enough to make one settings file difficult to understand.
- Add production logging, static-file serving, and deployment configuration in
  the deployment milestone.
