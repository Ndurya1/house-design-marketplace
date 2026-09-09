# Task 12 — Deployment rehearsal (in progress)

## Problem

The application passed its functional checks but lacked production configuration,
server templates, persistent-storage configuration and a coordinated backup plan.
Hosting and a domain have not been selected.

## What was missing or needed updating

Environment-only production settings, deployment documentation, a production WSGI
runtime, HTTPS/static/media routing templates, and backup/restore safeguards.

## Implementation

- Added plan.settings_production. It disables local .env loading, sets DEBUG=False,
  validates secrets/hosts/origin/database settings, and requires non-overlapping
  absolute media/static paths. HTTPS redirects and secure cookies are enabled.
  Proxy header trust must be explicitly enabled for a trusted proxy.
- HSTS starts at 300 seconds with subdomain/preload coverage deliberately disabled
  until domain policy is known. The two Django advisories remain visible.
- Added a pinned Linux Gunicorn dependency and loopback-bound process configuration,
  Nginx HTTPS/same-origin SPA/API templates, and placeholder environment values.
  Gunicorn/Nginx are not installed or started on this Windows development host.
- Added a backup command that requires a stopped-writes acknowledgement, refuses
  an existing destination or one inside media, dumps PostgreSQL and archives both
  media roots, then writes SHA-256 manifest hashes. Links/special files are rejected.
  It does not stop services, encrypt, upload, or automatically restore anything.
- Documented isolated restore, private media protection, reconciliation scheduling,
  rollback, and hosted acceptance steps. Replaced a password-like value in the
  public .env example with a clear placeholder; real local secrets are untouched.

## Files modified

- backend/plan/plan/settings.py and new settings_production.py.
- backend/.env.example and new requirements-production.txt.
- deploy/: production environment and Nginx templates, Gunicorn configuration,
  backup.py, check_configuration.py, test_backup.py and README.md.
- milestones.md and this notebook.

## Request flow

The proposed host accepts HTTPS at Nginx. React files are served directly;
/api/ and /admin/ requests reach loopback-bound Gunicorn and Django. Public images
and collected static assets have their own aliases. Private PDFs are delivered
only through authorized Django endpoints. The scheduler separately runs payment
reconciliation after hosted configuration and authorization.

## Verification

- Production configuration loads successfully with synthetic settings and only
  the two intentional HSTS warnings. Seven negative configuration checks pass.
- Five backup unit tests pass, using temporary files and a simulated pg_dump.
- Development Django system checks pass; migration dry-run reports no changes.
- All 117 PostgreSQL-backed regression tests pass.
- Frontend production build passes with VITE_API_BASE_URL=/api for the proposed
  same-origin deployment. Only a plugin-timing advisory was reported.

## Key lessons

Production configuration should fail early when required values are unsafe or
missing. A database backup alone cannot recover purchased PDFs. Both stores need
a coordinated snapshot, followed by an actual restore test. Passing configuration
checks is not proof of a working HTTPS deployment.

## Future considerations

Task 12 is not complete. Still required: select hosting/domain; establish the
consolidated repository/release; exercise Linux runtime and proxy; provision HTTPS
and persistent storage; configure worker scheduling, monitoring and backups; run a
real isolated restore; complete browser/receipt printing and authorized provider
rehearsals. No real payments or recurring jobs were triggered by this preparation.
