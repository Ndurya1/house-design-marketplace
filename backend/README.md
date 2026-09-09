# PlanSoko backend

This directory contains the Django and Django REST Framework backend for the
PlanSoko marketplace.

## Local setup

### 1. Create and activate a virtual environment

From the `backend` directory:

```powershell
py -3.13 -m venv planenv
.\planenv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Configure local environment variables

Create your local secrets file from the safe template:

```powershell
Copy-Item .env.example .env
```

Update `.env` with your own Django secret key, PostgreSQL credentials, and
Daraja sandbox credentials. Never commit `.env`.

`.env.example` is intentionally safe to commit. It documents the variables
the application needs without containing working credentials.

### 3. Create the PostgreSQL database

Connect to PostgreSQL as an administrator and create a dedicated local role
and database:

```sql
CREATE ROLE plan LOGIN PASSWORD 'choose-a-strong-local-password';
CREATE DATABASE plansoko OWNER plan_db;
```

Use the matching details in `.env`:

```text
DB_NAME=plan_db
DB_USER=plan
DB_PASSWORD=choose-a-strong-local-password
DB_HOST=127.0.0.1
DB_PORT=5432
```

The database and role names are examples. They may differ as long as the
values in `.env` match the PostgreSQL role and database you created.

### 4. Apply migrations

From the `backend` directory:

```powershell
cd plan
python manage.py migrate
```

`migrate` creates or updates database tables from the version-controlled
migration files. Do not manually create Django application tables.

### 5. Run the development server

```powershell
python manage.py runserver
```

The API is available at `http://127.0.0.1:8000/`. The React development server
uses `http://localhost:5173/`, which must appear in `CORS_ALLOWED_ORIGINS` in
your `.env`.

## Required environment variables

| Variable | Purpose |
| --- | --- |
| `SECRET_KEY` | Django cryptographic secret. |
| `DEBUG` | Enables development-only diagnostics when `True`. |
| `ALLOWED_HOSTS` | Comma-separated HTTP hosts Django accepts. |
| `CORS_ALLOWED_ORIGINS` | Comma-separated browser origins allowed to call the API. |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | PostgreSQL connection details. |
| `DARAJA_ENVIRONMENT` | `sandbox` locally; production requires deliberate configuration. |
| `DARAJA_CONSUMER`, `DARAJA_SECRET`, `DARAJA_PASSKEY`, `DARAJA_SHORTCODE` | Daraja credentials. |

## Verification commands

Run these from `backend/plan` after activating the virtual environment:

```powershell
python manage.py check
python manage.py showmigrations
python manage.py test
```

System checks, migration consistency checks, and the automated backend tests
should pass.

## Private blueprint storage

Blueprint PDFs live in `plan/private_media`, outside public `plan/media`.
After upgrading an existing installation, stop application writes, run
`python manage.py migrate`, then `python manage.py privatize_plan_files` before
restarting. The command verifies copied bytes before removing public originals,
is repeatable, and reports missing or conflicting files without overwriting them.

Keep private media out of web-server media aliases and include it in backups.
Block the retired `/media/plan_files/` path in production too; development URLs
already block it, including unreferenced historical uploads. The relocation
command handles database-referenced files only.

Owners and administrators download through authenticated
`GET /api/catalogue/{id}/plan-file/`. API responses expose `has_plan_file`,
never a public PDF URL. Paid buyer downloads use separate order grants described below.

Uploads accept PDFs up to 20 MiB and images up to 5 MiB. PDFs must parse,
contain pages, and be unencrypted. Structural checks do not inspect architectural
quality or scan for malware. Run tests with temporary public/private media roots.

## Important conventions

### Guest orders

Create an order with `POST /api/orders/` and JSON containing `guest_email`,
`guest_phone`, and `plan_ids` (1–20 distinct published plans). Do not supply a
buyer, status, currency, or amount: the server validates availability and snapshots
prices in one transaction. Kenyan mobile numbers normalize to +254 format.

The response contains a UUID `reference`, pending status, KES total, and item
snapshots. Authenticated reads use `/api/orders/{reference}/`. Guests cannot
retrieve orders using the reference alone; use the scoped credentials below.
Sellers receive only their own items and subtotal, without buyer contacts or other
sellers' totals. General order updates/deletion are disabled, including in admin.

Migration orders.0002 preserves legacy records with `is_legacy=true` and unknown
prices/totals as NULL. Back up before upgrading existing data; reversing a populated
snapshot migration is unsupported. Legacy records must be reconciled before any
new payment initiation.

### M-Pesa initiation

Order creation also returns a `checkout_token` valid for 30 minutes. Send it in
`X-Checkout-Token` when posting JSON with `order_reference` and a UUID
`idempotency_key` to `/api/payments/`. The owning authenticated buyer can use JWT
instead. The order reference alone is not authorization, and read responses do
not issue checkout tokens. Keep tokens out of URLs and logs.

Reuse the same idempotency key for retries of the same initiation request. Accepted
requests return an attempt with `pending` status, not a paid order. `unknown` and
stalled `initiating` attempts require reconciliation; another key cannot bypass
them. A rejected attempt may be retried using a new key.

`PAYMENT_INITIATION_ENABLED=False` is the default. Leave it disabled until the callback handler and reconciliation runner are
deployed and verified with an explicitly authorized end-to-end test. Before enabling, configure
`MPESA_CALLBACK_URL` as an HTTPS callback endpoint, `MPESA_CONNECT_TIMEOUT`
(default 5 seconds), `MPESA_READ_TIMEOUT` (default 20 seconds), and the existing
Daraja credentials/environment. The gateway supports PayBill STK payloads.

New payment attempts use stored KES totals and phone numbers. Fractional totals
are rejected, never rounded. No live STK transaction was used to verify Task 8;
automated tests mock the provider and exercise concurrency against PostgreSQL.

### Payment confirmation and purchased downloads

Order creation copies each purchased PDF to `private_media/order_files/` and
records its SHA-256 digest. Catalogue replacement or deletion cannot replace the
purchased file. Migration `orders.0003` intentionally does not backfill old orders
with today's PDFs: orders without reliable file snapshots cannot start payment.
Previously initiated payments can still be confirmed, with unavailable downloads
requiring operator recovery of the original file.

Configure the HTTPS callback URL to `/api/payments/callback/`. This public POST
endpoint accepts JSON up to 16 KiB, validates and deduplicates normalized callback
evidence, and acknowledges database receipt. It never unlocks files by itself.
Run the supplied worker command in the deployed environment:

```powershell
python manage.py reconcile_payments --limit 100
```

The command queries Daraja for stored, known checkout identifiers outside database
locks. Matching success then atomically completes the payment/order and creates
one grant per snapshot. Duplicate processing is safe; conflicts remain held for
operator review. Query failures remain unresolved and can be retried. New events
are prioritized ahead of already checked events. In production, schedule this
command regularly with overlap protection and monitoring; no scheduler is installed
by this task. Polling the checkout page only reads the local database.

A successful STK query verifies checkout status; the callback supplies the receipt,
amount and phone. Do not describe those fields as independently returned by the
query. Receipt uniqueness and amount/phone matching add consistency checks.
Unknown attempts without saved provider identifiers, lost callbacks, and conflicting
evidence need operator reconciliation; never retry a charge simply because it is
slow. Keep initiation disabled until actual Daraja responses, HTTPS callback delivery,
and the reconciliation runner have been verified in an authorized rehearsal.

The creation receipt also returns `checkout_session` (24 hours by default).
Send it in `X-Checkout-Session` to `GET /api/checkout/{order-reference}/` and to
`POST /api/downloads/{grant-reference}/token/`. The latter issues a download token
(default 10 minutes). Send that in `X-Download-Token` to
`GET /api/downloads/{grant-reference}/`. The owning buyer may use JWT instead.
Payment, session, and download tokens have separate signing purposes and cannot
substitute for each other. Tokens are never placed in URLs. Sensitive responses
are not cached. Downloads check payment state, grant revocation, file availability
and digest before streaming a private attachment.

The React checkout stores its credentials and retry key in `sessionStorage`.
Keep the tab open; closing it or losing the session removes guest access. Email
recovery is not implemented yet. Payment token expiry remains 30 minutes; a longer
checkout session does not extend permission to initiate payment. A paid order with
a missing/corrupt file stays paid and offers refresh/support, never a new charge.
Back up private files together with their database snapshot records. Revocation
is represented by `DownloadGrant.revoked_at`; dedicated audited revocation and
restoration controls remain follow-up work. Admin payment and download history
remains read-only.

### Marketplace operations in Django admin

Open `/admin/` on the backend server. A superuser can configure operator accounts;
ordinary marketplace operators need an active account, `is_staff=True`, role
`admin`, and the relevant Django model permissions. Staff login alone does not
grant model access. No operator accounts are created automatically.

- **Catalogue review:** filter listings to `In review`, open a listing, and use
  **Download PDF for review**. Return to the list, select records, then choose
  **Publish reviewed listings** or **Return listings to draft** in the action
  dropdown. Each listing is validated separately; failures are shown alongside
  successful changes. Non-draft content and status are read-only. Designers
  supply and replace PDFs through their existing workflow.
- **Designer suspension:** in Users, select ordinary designer accounts and use
  **Suspend selected designers** or **Reactivate selected designers**. Operators
  need the User change permission. Non-superusers see ordinary designers only
  and cannot edit roles, staff flags, account activation, or permissions directly.
  Staff accounts cannot be suspended through these bulk actions. User deletion
  is disabled in this admin interface.
- **Categories:** maintain categories through their existing forms. Deactivating
  a category hides its listings and prevents new orders. It does not change their
  review status; reactivation makes eligible published listings visible again.
- **Sales and payments:** inspect Orders and their inline item snapshots, follow
  **View payment attempts**, then **View callback evidence**. Search using order,
  checkout, merchant, or receipt references as appropriate. Payment and order
  records stay read-only; the admin dashboard cannot force payment success.
- **History:** publication, return-to-draft, suspension, and reactivation record
  the operator in Django's admin history in the same transaction as the change.
  API publication and return-to-draft use the same service and history recording.

Suspension blocks the designer's authenticated access, hides public listings,
and prevents new orders. It does not cancel existing orders or revoke purchased
downloads. Existing orders retain their payment and fulfilment flow. Category
deactivation follows the same visibility/new-order policy. Operations validate
availability at request time; an already-running checkout can overlap a
suspension or category change. These controls are not a refund or cancellation
workflow. Provider reconciliation continues through the existing worker.

### Payment receipts and quality checks

After verified payment, checkout offers **View payment receipt**. The receipt
page at `/checkout/{order-reference}/receipt` on the frontend lets the buyer print
or save as PDF using the browser. It fetches
`GET /api/checkout/{order-reference}/receipt/` using the existing checkout session
header or owning buyer's JWT. The response is private/no-store and contains only
saved purchase details, payment references, and the confirmation date. Receipt
access does not issue or renew checkout credentials. Email delivery and recovery
are not implemented.

Unpaid orders and completed orders without a verified payment cannot receive a
receipt. Cancelled orders display their cancelled state instead of a payment
button. A completed order missing verified payment evidence displays a support
message. Neither state is an invitation to pay again.

Seller-profile API responses now include a read-only `id` in addition to `user`.
Use `id` for `/api/seller/{id}/` updates; a user ID is not a profile ID.

Run backend checks from `backend/plan` with the virtual environment activated:

```powershell
python manage.py test users catalogue orders payments --noinput
python manage.py check
python manage.py makemigrations --check --dry-run
```

Run frontend checks from `frontend/PlanClient`:

```powershell
npm test
npm run lint
npm run build
```

The frontend tests use Node's built-in test runner without additional packages.

### Repository conventions

- Keep production and development databases on PostgreSQL. This avoids finding
  SQLite/PostgreSQL differences late in the release process.
- Database timestamps remain in UTC (`USE_TZ=True`); convert them to a user's
  local time only when displaying them.
- Commit migrations and `.env.example`; never commit `.env`, virtual
  environments, uploaded media, or database files.
