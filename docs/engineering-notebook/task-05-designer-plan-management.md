# Task 05 — Designer plan management

## Problem

Draft management and initial upload checks already existed, but catalogue
responses exposed blueprint URLs under public media. Review readiness could
become stale, and PDF validation trusted only a filename and header.

## What was missing or needed updating

- Private file storage and authenticated owner/admin access.
- Category, title, and price checks at submission; completeness at publication.
- Structural PDF validation and meaningful API errors in the dashboard.
- Isolated upload tests and verified relocation of legacy files.

## Implementation

- PDFs now use PrivatePlanStorage under private_media; storage refuses public URLs.
- plan_file is write-only in the serializer; has_plan_file reports attachment presence.
- GET /api/catalogue/{id}/plan-file/ authenticates and checks ownership/admin access
  before streaming an attachment with private, no-store caching.
- The dashboard downloads using its JWT and a temporary browser blob URL.
- pypdf 6.17.0 checks PDF structure, encryption, and page presence; existing size
  limits remain 20 MiB for plans and 5 MiB for thumbnails. Stream position is restored.
- Submission and publication share readiness checks. Existing designer draft-only
  editing/deletion and ownership enforcement remain in place.
- privatize_plan_files verifies SHA-256 equality before removing each referenced
  public original. Missing files and conflicting destinations are reported.
- The retired development /media/plan_files/ route returns 404, including orphaned files.
- Admin uploads use a plain file input to avoid requesting a private storage URL.

## Files modified

- backend/plan/catalogue/{models,serializers,validators,views,admin,tests}.py
- backend/plan/catalogue/storage.py
- backend/plan/catalogue/management/commands/privatize_plan_files.py and package initializers
- backend/plan/catalogue/migrations/0006_alter_catalogue_plan_file.py
- backend/plan/plan/{settings,urls}.py
- backend/{requirements.txt,README.md,.gitignore}
- frontend/PlanClient/src/api/{index.js,Catalogue.js}
- frontend/PlanClient/src/pages/SellerDashboard.jsx
- milestones.md and this notebook

## Request flow

Designer uploads multipart data -> JWT/role checks -> serializer and file
validation -> server-assigned ownership -> draft saved with private PDF.

Designer submits -> ownership and draft check -> readiness validation -> in_review.
Administrator publishes -> role and state check -> readiness validation -> published.

Owner/admin downloads -> JWT -> filtered queryset and object permissions -> private
storage opens file -> FileResponse -> browser blob download. Missing files return 404.

## Verification

- Full backend suite passed: 41 tests before the final retired-route regression.
- After adding that regression, all 28 catalogue tests passed.
- Django system checks pass; makemigrations --check --dry-run reports no changes.
- Migration 0006 applied locally. Relocation completed without errors and found
  no referenced public files requiring a move.
- Frontend npm run build passed. Browser interaction was not manually exercised.
- Tests cover owner/admin downloads, denied access, no public PDF URL, missing
  files, draft updates, review locks, inactive categories, incomplete publication,
  malformed/encrypted/empty PDFs, invalid images, size limits, price boundaries,
  relocation integrity/conflicts/missing files, and the retired public route.
- Upload tests use temporary public/private storage and generated valid PDF/image fixtures.

## Key lessons

API permissions do not protect files served independently by a media server.
Storage and download authorization must work together. A write-only upload field
allows a client to send a file without revealing its location in responses.
Readiness must be checked again at publication because related data can change.

## Future considerations

- Task 6: public catalogue search, filters, pagination, and related plans.
- Task 9: purchase-based guest download grants.
- Production hosting must keep private_media outside public aliases, block the
  retired plan_files path, and back up private files. Run relocation with writes stopped.
- Relocation handles referenced files only; orphan cleanup is separate.
- PDF parsing is not malware scanning or architectural review. Strict parsing can
  reject damaged files that permissive viewers repair.
- Concurrent listing edits/state transitions and file replacement cleanup remain
  hardening considerations; this change does not introduce locking or orphan cleanup.
