"""Environment-only settings for a server behind a trusted HTTPS proxy."""
import os
from pathlib import Path
from urllib.parse import urlsplit
from django.core.exceptions import ImproperlyConfigured

# Never silently inherit the developer's local secrets file.
os.environ['DJANGO_LOAD_DOTENV'] = 'False'
from .settings import *  # noqa: E402,F403


def required(name):
    value = os.getenv(name, '').strip()
    if not value or 'replace-' in value.lower():
        raise ImproperlyConfigured(f'{name} must be explicitly configured.')
    return value


SECRET_KEY = required('SECRET_KEY')
if len(SECRET_KEY) < 50 or len(set(SECRET_KEY)) < 5 or SECRET_KEY.startswith('django-insecure-'):
    raise ImproperlyConfigured('Use a long, randomly generated production SECRET_KEY.')
DEBUG = False
ALLOWED_HOSTS = [host.strip() for host in required('ALLOWED_HOSTS').split(',') if host.strip()]
if any('*' in host or '/' in host or host.startswith('.') for host in ALLOWED_HOSTS):
    raise ImproperlyConfigured('ALLOWED_HOSTS must contain explicit hostnames.')
SITE_ORIGIN = required('SITE_ORIGIN').rstrip('/')
origin = urlsplit(SITE_ORIGIN)
if (origin.scheme != 'https' or not origin.hostname or origin.path or origin.query or origin.fragment
        or origin.username or origin.password or origin.hostname not in ALLOWED_HOSTS):
    raise ImproperlyConfigured('SITE_ORIGIN must be an HTTPS origin matching ALLOWED_HOSTS.')
CORS_ALLOWED_ORIGINS = [SITE_ORIGIN]
CSRF_TRUSTED_ORIGINS = [SITE_ORIGIN]
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '300'))
if SECURE_HSTS_SECONDS < 0:
    raise ImproperlyConfigured('SECURE_HSTS_SECONDS cannot be negative.')
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SECURE_PROXY_SSL_HEADER = None
if os.getenv('TRUST_HTTPS_PROXY', 'False').lower() == 'true':
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

for field in ['NAME', 'USER', 'PASSWORD', 'HOST', 'PORT']:
    DATABASES['default'][field] = required(f'DB_{field}')
sslmode = required('DB_SSLMODE')
if sslmode not in ['disable', 'require', 'verify-ca', 'verify-full']:
    raise ImproperlyConfigured('Choose an explicit PostgreSQL TLS mode.')
DATABASES['default']['OPTIONS'] = {'sslmode': sslmode}
DATABASES['default']['CONN_MAX_AGE'] = 60
DATABASES['default']['CONN_HEALTH_CHECKS'] = True


def storage_root(name):
    value = Path(required(name))
    if not value.is_absolute():
        raise ImproperlyConfigured(f'{name} must be an absolute persistent path.')
    return value.resolve()


MEDIA_ROOT = storage_root('MEDIA_ROOT')
PRIVATE_MEDIA_ROOT = storage_root('PRIVATE_MEDIA_ROOT')
STATIC_ROOT = storage_root('STATIC_ROOT')
roots = [MEDIA_ROOT, PRIVATE_MEDIA_ROOT, STATIC_ROOT]
for index, left in enumerate(roots):
    for right in roots[index + 1:]:
        if left == right or left in right.parents or right in left.parents:
            raise ImproperlyConfigured('Public media, private media and static roots must not overlap.')
STATIC_URL = '/static/'
MEDIA_URL = '/media/'
if PAYMENT_INITIATION_ENABLED and MPESA_CALLBACK_URL != SITE_ORIGIN + '/api/payments/callback/':
    raise ImproperlyConfigured('The enabled payment callback must match this deployment HTTPS origin.')
