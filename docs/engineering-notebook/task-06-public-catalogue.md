# Task 06 — Public catalogue

## Problem

The category page loaded unpaginated records and its detail buttons did nothing.
Public catalogue results included a designer's own drafts when logged in, and
several navigation links sent category names to endpoints expecting numeric IDs.

## What was missing or needed updating

Published-only public reads, validated search/price/category filters, predictable
sorting, pagination, plan details, related plans, and working category navigation.

## Implementation

- List, retrieve, and related actions always query published plans. Designer
  drafts remain available through mine and authorized management actions.
- CatalogueQuerySerializer validates search (up to 200 characters), positive
  category IDs, nonnegative decimal price limits, range order, and sort choices.
- Search matches a case-insensitive phrase in title or description. Category and
  inclusive price filters combine before database pagination.
- Newest sorts by descending created_at/id; price sorts use ascending id to break
  ties. Each public list page contains at most 12 plans.
- GET /api/catalogue/ returns count, next, previous, results. Mine remains an array.
- GET /api/catalogue/{id}/related/ returns up to four other published plans in the
  same category, newest first. Hidden source plans return 404.
- Category deactivation prevents new submissions but does not hide already
  published plans. Explicit category filtering still works for those listings.
- /plans browses all plans, /plans/:category retains category-ID browsing, and
  /plan/:id displays details and related plans through shared PlanCard components.
- Filters and page live in URL query parameters; submitting filters resets page.
  AbortController cancels outdated requests and errors clear previous results.
- Homepage category cards resolve active API category names to actual IDs and
  show an unavailable state when there is no match. General browsing links use /plans.

## Files modified

- backend/plan/catalogue/serializers.py, views.py, pagination.py
- backend/plan/catalogue/tests.py, test_public_catalogue.py
- frontend/PlanClient/src/api/Catalogue.js, index.js
- frontend/PlanClient/src/pages/BrowsePage.jsx, PlanDetailPage.jsx, HomePage.jsx, AboutPage.jsx
- frontend/PlanClient/src/components/PlanCard.jsx, Header.jsx, Footer.jsx
- frontend/PlanClient/src/App.jsx
- milestones.md and this notebook

## Request flow

Browse URL -> React reads filters -> catalogue API -> published queryset -> query
validation -> search/category/price filtering -> stable ordering -> 12-row page
and count -> serialized results -> cards and previous/next controls.

Card link -> /plan/:id -> detail and related API requests -> published-only lookup
-> plan information and related cards. Blueprint URLs are never returned.

Designer dashboard -> /catalogue/mine/ -> own listings including drafts.
Management actions retain ownership/status checks and ignore browsing filters.

## Verification

- All 50 backend tests passed against PostgreSQL in 48.567 seconds.
- Migration consistency check reports no changes; no migration was necessary.
- Frontend production build passed.
- Browser checks confirmed empty results, filter state in the URL, invalid price
  range feedback, and unavailable detail state. No published records are present
  locally, so populated detail/related/pagination UI was not manually exercised.
- API tests cover every account role, draft/review exclusion, phrase search,
  combined filters and inclusive boundaries, invalid inputs/pages, stable ties,
  pagination links, inactive categories, related exclusions/limits, and draft editing.
- Anonymous catalogue list uses two database queries (count plus joined page),
  avoiding one query per seller/category while serializing cards.

## Key lessons

Filter before pagination: filtering only the loaded browser page misses matching
plans elsewhere. A deterministic tie-breaker prevents equal prices or timestamps
from producing inconsistent page boundaries on an unchanged dataset.

Public browsing and designer management have different visibility rules. Select
the queryset by action before applying user-specific management access.

URL query parameters preserve browsing state across refresh and back navigation.
Cancellation prevents slow, obsolete requests from replacing newer results.

## Future considerations

- Task 7 introduces guest orders; checkout and paid downloads are not part of this task.
- Offset pagination can shift when new plans are published between requests.
- Consider PostgreSQL search indexes/full-text search when catalogue size warrants it.
- Homepage category cards are editorial names matched to active database categories;
  renamed or unavailable categories are intentionally disabled.
- Additional filters such as bedrooms/area require domain fields not currently modeled.
