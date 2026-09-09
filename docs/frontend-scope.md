# F01 — Frontend launch scope and data contracts

Recorded 9 September 2026, after approval of the frontend audit and roadmap.

## Confirmed decisions

- Keep the existing architectural visual identity: blue/slate, Inter for operational UI, Playfair for editorial headings.
- Use whole-KES plan prices. The user explicitly approved this on 9 September. This is an implementation requirement, not a claim that validation has already changed.
- Label seller income **Revenue** until a payout system is defined. Revenue means gross completed sales, not money available to withdraw.
- Complete buyer and designer journeys from the approved roadmap. Staff continue using Django admin.

## Journeys and screen contracts

API paths below include `/api/`. New frontend paths are implementation choices for the approved journeys, not routes already installed. Every remote-data screen must distinguish loading, empty, failure and successful data; failed requests must not display fabricated zero totals.

| Frontend destination | API/data contract | Access and implementation |
| --- | --- | --- |
| `/`, `/about` | Editorial content; categories/catalogue where needed | Public. Remove unsupported feature and trust claims in F15. |
| `/plans`, existing `/plans/:category` | GET `/api/categories/`, `/api/catalogue/`; search, integer category, min/max price, ordering, pagination | Public published catalogue. Preserve existing links; repair category-name footer link. |
| `/plan/:id` | GET `/api/catalogue/:id/`, `:id/related/` | Public published detail. Current fields: id, title, category/name/group, description, price, thumbnail, seller/name, status, timestamps, has_plan_file. Paid file is write-only in serialization. |
| `/signUp` and login entry | POST `/api/register/` with name/email/password; `/api/login/` with email/password; `/api/token/refresh/` | Registration creates sellers. Login returns access/refresh and user identity. Share form/session state; preserve existing sign-up URL. |
| `/dashboard` | GET `/api/catalogue/mine/`, `/api/orders/` | Authenticated seller. Summary only: design states, completed orders, gross revenue, recent sales, useful actions. |
| `/dashboard/designs` | GET `/api/catalogue/mine/` | Seller-owned designs; dedicated list/filter interface. |
| `/dashboard/designs/new`, `/dashboard/designs/:id`, `/dashboard/designs/:id/edit` | POST `/api/catalogue/`; GET/PATCH/DELETE `/api/catalogue/:id/`; POST `:id/submit/`; GET `:id/plan-file/` | Backend remains authority for ownership and lifecycle. Multipart uploads; never expose private files as public preview URLs. |
| `/dashboard/orders`, `/dashboard/orders/:reference` | GET `/api/orders/`, `/api/orders/:reference/` | Existing seller serializer returns reference, status, currency, is_legacy, created_at, own items, subtotal. No guest contact or complete mixed-seller order total. |
| `/dashboard/revenue` | Seller orders, or scoped aggregate API if later needed | Completed sales only. No payout/withdrawal controls or invented commissions. |
| `/dashboard/settings` | GET `/api/seller/`, PATCH `/api/seller/:profileId/` | Fields: id, read-only user, phone, avatar, bio. Use actual profile ID, not user ID. Name/email editing needs a separate contract. |
| `/checkout/new/:planId` | POST `/api/orders/` with guest_email, guest_phone, plan_ids | Server determines price and snapshots. Response provides checkout credentials; do not expose these in seller screens. |
| `/checkout/:reference` | POST `/api/payments/`; GET `/api/checkout/:reference/`; POST `/api/downloads/:reference/token/`; GET `/api/downloads/:reference/` | Preserve checkout-token/session and download-token headers, server-confirmed completion and idempotent initiation. Existing client helpers implement these boundaries. |
| `/checkout/:reference/receipt` | GET `/api/checkout/:reference/receipt/` | Credential-scoped receipt and print view. |
| `/privacy`, `/terms`, `/plan-license`, `/refund-policy`, `/designer-agreement` | Approved editorial documents | Public, linked from relevant forms/footer. Content and any recorded acceptance require actual business inputs. |
| `/contact`, `/help` | Approved support channel/process | Do not ship a form that cannot deliver requests. Business contact is pending. |
| Recovery destinations, to be defined in F04/F14 | No password-reset or guest-recovery endpoints found in current URL definitions | Add secure backend/email workflow before claiming self-service recovery. |

## Reporting and money rules

1. Show overview metrics as **All time** until a real date filter is implemented. Define the order metric as **Completed orders**, counting each eligible reference once.
2. Revenue sums the seller's immutable item prices for completed orders in the selected period. Never use current catalogue prices or a mixed-seller order total.
3. Seller item fields are plan_id_snapshot, seller_id_snapshot, title_snapshot, seller_name_snapshot and unit_price. The serializer returns a null subtotal if any own item price is unknown. Show unknown legacy amounts explicitly; do not coerce null to zero or claim a complete total when some amounts are unavailable.
4. Initial date filtering uses order `created_at` and labels this as order date; the seller contract has no completion timestamp. A report advertised by payment/settlement date requires a new contract. Use Africa/Nairobi boundaries for displayed day ranges and compare normalized timestamps.
5. Whole-KES validation must be enforced in both write API and UI in F07. Preserve decimal storage/history; do not migrate or round old orders. Flag existing fractional listings for intentional correction before purchase. Reject unsupported amounts with clear errors; opening an editor must never change a price.
6. Confirm complete data coverage before computing totals. If pagination is introduced or results are incomplete, obtain server aggregates or deliberately load all applicable pages; do not report the current page as the entire business.

## Dependencies and decisions still required

| Item | State | Where resolved |
| --- | --- | --- |
| Published operator name and support email/phone | Asked; awaiting owner input | F13/F14; does not block UI tokens or dashboard work |
| License scope, refunds/disputes, designer obligations | Owner decisions required; no terms invented | F13 before public launch |
| Privacy data inventory, processors, retention and effective policy dates | Review actual operations and obtain approved content | F13 |
| Architectural specifications and preview assets | Current catalogue lacks bedrooms, area, storeys, plot dimensions and gallery | F11: agree minimum fields/units, then implement storage, API and seller inputs together |
| Review explanations | No serialized reason in current catalogue contract | F07 coordinated backend work if included |
| Password and guest-order recovery | Missing endpoint/workflow dependencies | F04/F14 |
| Account identity editing and public designer profile | Not covered by current profile editor contract | F10 scope/API decision; do not expose unsupported controls |

Comparisons, saved plans, messaging, professional verification, automated payouts and a React staff dashboard remain optional expansions. Their absence must be reflected in marketing. Do not defer the approved core dashboard or policy/support work under this optional list.

## Verification and next step

Checked against `backend/plan/{catalogue,orders,users}/serializers.py`, corresponding URLs, `orders/views.py`, project URLs and frontend API helpers. Seller order retrieval already exists; no new endpoint is needed merely to create its detail page. No database or application behavior changed in F01.

F01 remains in progress for outstanding business inputs. Independent F02 UI foundation work can proceed using confirmed visual direction; policy publication cannot proceed with invented details.
