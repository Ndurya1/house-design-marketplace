# PlanSoko MVP milestones

Frontend completion is tracked separately in [frontend-milestones.md](frontend-milestones.md),
based on the [frontend audit](docs/frontend-audit.md). Completed backend tasks below
do not imply that every frontend page is complete. Public launch also requires
the frontend acceptance gate and resolution of its launch-blocking findings.

This roadmap is ordered by dependency. Complete each task using the concise
three-stage workflow in `instructions.md`: assess and plan; review the proposed
code and implement it after approval; then verify and document it before
starting the next task.

## Milestone 1 — Foundation and access control

Goal: establish a reproducible backend and ensure only the correct people can
access or change marketplace resources.

| Task | Outcome | Status |
| --- | --- | --- |
| 1. Configuration and local environment | PostgreSQL, environment variables, CORS, migrations, dependency documentation. | Complete |
| 2. Designer authentication | Reliable designer-only registration, email login, JWT lifecycle, and correct profile creation. | Complete |
| 3. Authorization and ownership | Designers manage only their own records; administrators have controlled access. | Complete |

## Milestone 2 — Marketplace catalogue

Goal: make a reviewed, searchable plan catalogue that designers can manage and buyers can browse.

| Task | Outcome | Status |
| --- | --- | --- |
| 4. Categories and listing lifecycle | Admin-managed categories and draft/review/published plan states. | Complete |
| 5. Designer plan management | Secure plan creation, editing, submission, and file validation. | Complete |
| 6. Public catalogue | Published-plan list/detail pages, search, filters, pagination, and related plans. | Complete |

## Milestone 3 — Orders, M-Pesa, and downloads

Goal: allow a guest buyer to make a verified payment and receive only the files they purchased.

| Task | Outcome | Status |
| --- | --- | --- |
| 7. Guest order domain | Immutable order and order-item snapshots for guest checkout. | Complete |
| 8. M-Pesa payment initiation | Persisted pending payment and STK Push initiated from server-side order data. | Complete |
| 9. Callback and download fulfilment | Idempotent callback handling, payment confirmation, and secure download grants. | Complete |

## Milestone 4 — Operations and launch readiness

Goal: enable marketplace operations and prepare a safe MVP release.

| Task | Outcome | Status |
| --- | --- | --- |
| 10. Admin operations and sales | Listing review, designer suspension, categories, sales, and payment visibility. | Complete |
| 11. Quality and hardening | Automated tests, error handling, lint fixes, validation, and receipts. | Complete |
| 12. Deployment rehearsal | Production settings, HTTPS, backups, media strategy, and end-to-end launch test. | In progress — preparation applied; hosted and restore rehearsals pending |

## Completion rule

A task is complete when the implementation has been approved, verified, and
documented well enough for you to recreate the approach in a new Django project.
