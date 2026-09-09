# Deployment preparation and rehearsal

Status: preparation applied, not a completed deployment. Domain and hosting are
unselected. No infrastructure, certificates, recurring jobs or payments are created
by these files. Task 12 stays incomplete until the hosted and restore rehearsals pass.

## Deployment shape

The template targets any Linux host with Python 3.13, PostgreSQL, Node, Nginx and
persistent disk: HTTPS proxy -> React static build / Django WSGI -> PostgreSQL.
Windows remains the local development environment. Gunicorn and Nginx configuration
must be exercised on Linux/WSL or the chosen host before deployment acceptance.

Keep data outside release directories: public images, private PDFs and collected
static files have separate absolute roots. Never expose the private directory by
an Nginx alias. Attach durable storage before migrating or accepting uploads.

## Prepare a release

1. Establish one Git repository for the consolidated workspace, excluding secrets,
   virtual environments, media and `.consolidation-backup`. Record the tested commit.
2. Create a separate rehearsal database and media roots. Never point rehearsal
   commands at the working database or production storage.
3. Copy the production environment template to the host's secret store or private
   process environment. It is not loaded automatically. Generate a new secret;
   use a database account scoped to this database and explicit hostnames. Do not
   rotate a live secret during routine redeploys: guest credentials use it.
4. On the Linux host, install `backend/requirements-production.txt`. From
   `backend/plan`, with `DJANGO_SETTINGS_MODULE=plan.settings_production` loaded, run:

   ```text
   python manage.py check --deploy --fail-level ERROR
   python manage.py migrate --plan
   python manage.py migrate --noinput
   python manage.py collectstatic --noinput
   gunicorn --config ../../deploy/gunicorn.conf.py plan.wsgi:application
   ```

5. In frontend/PlanClient, run `npm ci`, `npm test`, `npm run lint`, then build with
   `VITE_API_BASE_URL=/api` set in the build environment. Never place secrets in
   VITE variables. Copy the built dist directory into the configured release path.
6. Provision the domain/certificate, render the Nginx template, and run `nginx -t`.
   Forwarded HTTPS headers may be trusted only when the application is inaccessible
   directly and the proxy overwrites client headers. Gunicorn binds to loopback.
   Adapt bind/firewall rules explicitly if the proxy runs on another machine.
7. Configure a service manager to restart WSGI on failure and capture restricted
   error logs. Add request-rate and upload limits at the selected ingress; verify
   legitimate callback retries and status polling still work.

The templates start with a five-minute HSTS lifetime and no preload/subdomain
coverage. Increase only after certificate renewal and HTTPS behavior are verified.
The deployment check therefore reports security.W005 and security.W021; review
these two intentional advisories and reject any additional warning. They are not
silenced in settings. Switch to a zero-warning gate only once domain policy is set.
Managed PostgreSQL should use verified TLS with the provider's CA; local secured
connections may use an explicitly configured alternative.

## Reconciliation process

Keep PAYMENT_INITIATION_ENABLED=False until the hosted callback is reachable and
the provider rehearsal is authorized. Configure the host's scheduler to run
`python manage.py reconcile_payments --limit 100` using the same application
environment. Enforce one worker at a time using the scheduler's overlap protection
or an OS lock. Set a timeout based on the bounded provider calls, capture exit
status, and alert on repeated failures/unresolved attempts. Test restarting it.
No recurring scheduler is installed by this patch; it contacts Daraja when run.

## Local configuration checks

From the project root, using the backend virtual environment:

```text
python deploy/check_configuration.py
python -m unittest discover -s deploy -p test_backup.py
```

The configuration checker starts isolated processes against the actual production
settings using synthetic values. It accepts only the two documented HSTS warnings
and tests rejection of seven unsafe configurations. It does not connect to a
database. Backup unit tests use temporary media and a simulated pg_dump, not an
actual database backup or restore. Neither check makes provider calls.

## Coordinated backup and isolated restore

1. Pause inbound application traffic and stop WSGI, reconciliation workers and all
   other database/media writers. During payment maintenance, account for callback
   retries and reconcile unresolved attempts before reopening checkout.
2. With the application's environment loaded, run from the project root:
   `python deploy/backup.py /secure/backups/unique-snapshot --writes-stopped`.
   The destination must not exist. The flag confirms actual maintenance; it does
   not stop anything for you. A failed backup has no completed manifest and must
   not be treated as recoverable. Use pg_dump matching the server's major version.
3. Verify the manifest hashes, restrict filesystem permissions/Windows ACLs, and
   encrypt an off-host copy. This script does not encrypt or upload backups.
   Retain the matching application release and secrets separately in secure storage.
4. Create a new EMPTY database owned by a dedicated rehearsal role. Explicitly set
   PGHOST, PGPORT, PGUSER and PGDATABASE to that isolated target. Restore with:
   `pg_restore --no-owner --no-acl --exit-on-error --single-transaction --dbname=<new-rehearsal-database> database.dump`.
   Never use `--clean` against an existing working database. Restore only trusted
   dumps, because restoring a dump can execute database code.
5. Extract the media archive with Python's `tarfile` data filter into a NEW empty
   rehearsal directory after hash verification. Point MEDIA_ROOT to its public
   subdirectory and PRIVATE_MEDIA_ROOT to private. Do not overlay live directories.
6. Keep payment initiation off and outbound provider access blocked in the restored
   environment. Check migration state, order/item counts and every purchased-file
   SHA-256 against OrderFileSnapshot.sha256. Open a known paid order, download its
   preserved PDF and compare bytes, then inspect its receipt. Record results and
   restore duration. Backup success alone is not a restore rehearsal.
7. Restart the original services only after backup completion is verified. Rollback
   uses the matching release plus coordinated backup; review migrations before
   switching old code onto a newer database.

## End-to-end acceptance record

Record pass/fail and evidence for each on the isolated/hosted rehearsal:
- 117 backend tests (plus deployment tests), frontend tests/lint/build.
- HTTPS redirects, rejected foreign Host headers, secure admin cookies, correct
  static files, SPA route refresh, and denied direct private/retired PDF URLs.
- Register designer, edit profile, upload draft, submit, inspect PDF in admin,
  publish, browse/filter, and create guest order.
- Provider sandbox STK/callback/reconciliation only with explicit authorization
  and the designated test phone. Verify uncertain retries do not double-charge.
- Paid PDF download, receipt print preview/save, another buyer denied, expired
  tokens denied, suspension preserving paid downloads.
- Service restart and redeploy retain database/media; coordinated restore works.
- Rollback instructions, certificate renewal, worker monitoring, backup retention
  and restore evidence are recorded before declaring Task 12 complete.

## Sources

- https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/
- https://docs.djangoproject.com/en/6.0/ref/settings/#secure-proxy-ssl-header
- https://www.postgresql.org/docs/current/app-pgdump.html
- https://www.postgresql.org/docs/current/app-pgrestore.html
- https://pypi.org/project/gunicorn/ (26.2.0 runtime pin; Linux testing still required)
