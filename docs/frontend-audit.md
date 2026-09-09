# PlanSoko frontend audit

Date: 8 September 2026. Scope: the React application in `frontend/PlanClient`, its API contracts, public content, and seller dashboard. “Database pages” is interpreted as dashboard pages. Database tables do not each need a public screen; staff operations remain in Django admin.

## Assessment

The frontend is partially implemented. The catalogue, plan detail, checkout, receipt, and parts of designer management exist, but the navigation implies dedicated screens that do not exist. Backend milestone completion does not establish frontend completeness. The implementation roadmap is [frontend-milestones.md](../frontend-milestones.md).

### Evidence and limits

Reviewed routes, components, styles, API helpers, and backend feature coverage. Also rendered home, about, catalogue, plan detail, registration, dashboard, profile, and profile editor in headless Chrome at 1440 × 900 and 390 × 900. The browser used intercepted API responses containing synthetic designer, plan, and order records; no real account or payment was modified. The built-in browser tool failed to initialize, so local Playwright was used.

[Browser observations](frontend-audit-evidence/observations.json) record headings, viewport widths, and runtime errors (none in these sampled renders). These are viewport captures, not complete interaction tests. Checkout/receipt were source-reviewed, not included in the screenshot run. Synthetic thumbnails are not evidence about production image availability. Font-family declarations were recorded; remote font delivery was not independently certified. No complete contrast, keyboard, screen-reader, narrow-phone, live-payment, or legal-compliance assessment is claimed.

## Route and journey inventory

Source: `frontend/PlanClient/src/App.jsx`.

| Area | Current route | Assessment |
| --- | --- | --- |
| Marketing | `/`, `/about` | Built, but claims exceed implemented capabilities. |
| Catalogue | `/plans`, `/plans/:category` | Search/filter/pagination exist; footer supplies an outdated category name. |
| Product | `/plan/:id` | Basic detail and purchase flow; architectural specifications, preview gallery, and licensing information missing. |
| Registration | `/signUp` | Static form, disconnected from registration API. |
| Authentication | Header modal | Login/registration integration exists; inconsistent entry mode, session lifecycle, and accessibility. |
| Seller overview | `/dashboard` | Metrics and design/profile management combined; recent sales unimplemented. |
| Seller settings | `/dashboard/settings` | Editor works in part; summary is raw profile values. |
| Designs / orders / earnings | No dedicated routes | Menu items all lead to `/dashboard`. |
| Checkout | `/checkout/new/:planId`, `/checkout/:reference` | Implemented payment-state flow; support and policy connections missing. |
| Receipt | `/checkout/:reference/receipt` | Implemented printable receipt; include in browser acceptance tests. |
| Business and support | No routes | Privacy, terms, licensing, refund policy, designer agreement, contact/help absent. |
| Recovery / public designer | No routes | Password recovery, guest order recovery, and public designer portfolio need scope/API decisions. |
| Staff operations | Django admin | Existing intentional administration interface; a React admin replacement is not required. |

## Functional findings

P0 = address before public launch; P1 = core completion/usability; P2 = optional expansion. Priority here is product readiness, not a security vulnerability score. Paths below are relative to `frontend/PlanClient/src`.

| ID | Priority | Evidence and impact | Roadmap |
| --- | --- | --- | --- |
| A01 | P0 | `components/register.jsx` has no submit/API integration; seller CTAs from Home/About lead here. Header Sign Up opens the modal's default login mode. Acquisition has inconsistent and dead-end paths. | F04 |
| A02 | P0 | `components/sideNav.jsx` and `MobileNav.jsx` send multiple menu entries to `/dashboard`; `App.jsx` declares only overview/settings children. Users cannot reach the screens the menu promises. | F03, F06, F08, F09 |
| A03 | P1 | `pages/DashboardOverview.jsx` labels all-time metrics “this week”; “Orders” counts completed sales; Recent sales is empty and “view all” inert. Fetch failures are console-only, allowing zeros to resemble valid empty data. | F05 |
| A04 | P0 | `DashboardOverview.jsx` initializes edit price with `Math.round(Number(plan.price))`. Opening and saving can change fractional prices without intent. Backend decimal precision and M-Pesa whole-shilling restrictions need an explicit shared rule. | F07 |
| A05 | P1 | Design CRUD exists inside overview, but no dedicated searchable/filterable workflow, per-design management destination, or review feedback experience. Backend review feedback data must be agreed before displaying reasons. | F06, F07 |
| A06 | P1 | Completed seller sales are available to overview, but no order list/detail or revenue report. Gross sales do not establish available balance, commission, settlement, or payout status. | F08, F09 |
| A07 | P1 | `pages/ProfileSettings.jsx` displays database ID and phone; `profile.user` is absent from retained state. The profile object is always truthy, so its summary loading alternative cannot appear. Errors only reach console. Profile editing is duplicated in overview. | F10 |
| A08 | P0 | `components/Header.jsx` mobile menu lacks an action; Contact uses `#`. Footer Contact also uses `#`, and House Designs points to `/plans/Bungalows` although category filtering expects an ID. | F03 |
| A09 | P1 | `api/users.js` exposes refresh but callers do not use it. Header/sidebar maintain their own stored-user state; dashboard entry checks local token presence. Expired sessions need consistent recovery and visible failure states. Backend authorization remains essential. | F04 |
| A10 | P1 | `components/AuthModal.jsx` masks different API errors and lacks a complete dialog focus/keyboard lifecycle. Icon-only design actions and clickable navigation divs also need accessible semantics/names. | F02, F03, F04, F16 |
| A11 | P1 | `pages/PlanDetailPage.jsx` and catalogue expose basic plan fields, but marketing describes bedrooms, plot dimensions, detailed previews, and comparisons. Existing data contracts do not support this complete experience. | F01, F11, F15 |
| A12 | P0 | No business policy pages or usable support destination. Checkout cannot link customers to actual refund, use-license, privacy, or assistance information. | F12, F13, F14 |
| A13 | P0 | Home/About claim professional verification, designer messaging/contact, comparisons, and direct payouts without matching workflows/data. Testimonials and audience claims need substantiation. Implement approved scope or correct the copy. | F01, F15 |
| A14 | P1 | Guest credentials expire and there is no self-service recovery flow. Password recovery likewise needs server/email support. Missing access must not be solved by exposing private files or weakening order credentials. | F04, F14 |
| A15 | P1 | Current helper checks/lint/build do not test complete browser journeys. Missing navigation and static registration can survive those checks. | F16 |

## Existing visual direction

The intended identity is an architectural marketplace: large house imagery, blue actions/navigation, dark slate text, pale slate backgrounds, white cards, and restrained borders/shadows. Playfair Display provides editorial marketing headings; Inter supports forms, catalogue information, and dashboard work. Preserve this distinction while making component rules consistent.

The desktop [home capture](frontend-audit-evidence/home-1440.png) demonstrates that direction. The [dashboard capture](frontend-audit-evidence/dashboard-1440.png) confirms the empty sales strip with a completed sample order, very small secondary labels, and multiple competing card styles. The [mobile editor capture](frontend-audit-evidence/settings-edit-390.png) shows crowding between the designer identity and bottom navigation.

## UI inconsistencies and proposed rules

These are proposed implementation targets, not changes already applied.

| Dimension | Current evidence | Direction for F02/F16 |
| --- | --- | --- |
| Typography | Home section headings switch between Playfair 36px and Inter 48px on desktop. About hero is 60px; standalone sign-up title 48px; catalogue 30px. Some variation is appropriate, but roles are undocumented. UI also uses 10/11px copy. | Define heading roles. Use Playfair for editorial heroes/sections and Inter for operational screens. Start with 14–16px UI body, 12px secondary labels, 20–24px subsections, 28–32px app titles; document responsive marketing exceptions. |
| Font weights | CSS imports Inter 400/500/600/700 and limited Playfair variants; components request additional weights. | Load intended variants or constrain usages to loaded weights; verify font delivery and fallback rendering. |
| Tokens | `index.css` redefines `--spacing-1` repeatedly, ending at 24px; `--text-small` is 1px; several color variables are blank and success is misspelled. These coexist with a separate semantic HSL token set. | Adopt one consumed token system; remove or repair disconnected definitions. Do not assume these unused values currently determine rendered sizes. |
| Colors | Semantic primary and raw blue-500/600/700/800 coexist; gray/slate/black and multiple border/status colors vary. | Define primary/hover, text/secondary, surface/border, success/warning/error roles; measure foreground/background combinations, including muted copy and footer branding. |
| Spacing/layout | Dashboard/settings compensate with `ml-12`/`ml-16`; profile editor uses fixed 360/340/300px widths plus padding/margins. | Let the shell own sidebar offsets; use fluid children, consistent container/gutters and a 4/8/12/16/24/32/48/64/96px scale. Test at 320px as well as sampled widths. |
| Shape/elevation | Cards and controls mix several radii through 3xl, with an extreme registration corner; borders/shadows differ across operational screens. | Establish control/card/dialog families, e.g. 8/12/16px radii and documented elevation; allow explicit marketing exceptions. |
| Controls | Shared Button/Input/Card exist but many screens use independent styles and browser alerts/confirms. | Standardize form fields, buttons, confirmation dialogs, alerts, status badges, loading/empty/error panels, tables/cards, and currency/date display. |
| Invalid utilities | Source includes `text-md`, `text-xxs`, `text--blue-800`, `items-left`, `justidy-left`, `items-justify`, `p-btn`, `bg-outline`, and `glassmorphism` without corresponding theme/style definitions. | Replace with supported utilities or intentional named components; check computed styles. |
| Navigation/accessibility | Pressed `active:` styling is not current-route indication; clickable divs, unnamed icons, missing label associations, and modal focus behavior need correction. | Semantic links/buttons, visible keyboard focus, current-page state, labelled controls/errors, usable dialogs, meaningful headings/landmarks, and sufficiently large targets. |
| Responsive behavior | No document-level overflow at 390px in sampled renders, but mobile bottom navigation crowds identity; fixed profile widths remain a narrower-device risk. | Treat overflow and overlap separately. Test 320/390/768/1024/1440px, long names, zoom, error text, menu expansion, and virtual keyboard behavior. |

## Frontend versus backend versus business work

- **Frontend work using existing capabilities:** functional registration, navigation, overview, designer plan management, seller sales displays, profile editor, clearer errors, shared UI, policy/support presentation, and content corrections.
- **Coordinated API/data work:** architectural specifications and preview assets; password/guest-order recovery; public designer profile if approved; review explanations; server aggregates/pagination if current seller responses cannot support complete reports. Verify actual serialized fields before designing screens around them.
- **Business decisions:** operator/contact identity, support process, license scope, refund/dispute procedure, privacy data inventory/retention, designer terms, pricing precision, verification claims, and any commission/payout model. Policy text needs owner approval and appropriate review; do not invent promises or retention periods.
- **Optional expansion:** comparisons, saved plans, in-app messaging, automated payouts, professional verification, and a bespoke React staff dashboard. These are not silently included in the MVP; remove unsupported promotional claims unless separately approved and built.

Home FAQ also contains construction and regulatory guidance outside the implemented marketplace journey. Replace it with relevant buying/selling/support information; retained technical or legal claims require qualified review.

## Release decision

Complete the P0 items and the core frontend journeys before public launch. Finish F16 against the agreed scope, alongside backend task 12's real deployment/payment/restore rehearsal. Do not label deployment readiness or successful backend tests as frontend acceptance.
