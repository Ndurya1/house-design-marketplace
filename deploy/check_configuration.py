from pathlib import Path
import os

import subprocess
import sys
import re

root = Path(__file__).resolve().parent
workspace = root.parent
draft = workspace / 'backend/plan'

environment = os.environ.copy()
environment.update({
    'DJANGO_SETTINGS_MODULE': 'plan.settings_production',
    'SECRET_KEY': 'synthetic-rehearsal-only-' + '0123456789abcdefghijklmnopqrstuvwxyz' * 2,
    'ALLOWED_HOSTS': 'plansoko.example.com', 'SITE_ORIGIN': 'https://plansoko.example.com',
    'DB_NAME': 'not_connected', 'DB_USER': 'not_connected', 'DB_PASSWORD': 'synthetic-password',
    'DB_HOST': '127.0.0.1', 'DB_PORT': '5432', 'DB_SSLMODE': 'require',
    'PAYMENT_INITIATION_ENABLED': 'False', 'TRUST_HTTPS_PROXY': 'True',
    'MEDIA_ROOT': str(root / 'runtime/public'), 'PRIVATE_MEDIA_ROOT': str(root / 'runtime/private'),
    'STATIC_ROOT': str(root / 'runtime/static'),
})
command = [sys.executable, 'manage.py', 'check', '--deploy', '--fail-level', 'ERROR']
result = subprocess.run(command, cwd=draft, env=environment, capture_output=True, text=True)
print(result.stdout)
if result.returncode:
    print(result.stderr)
    raise SystemExit(result.returncode)
warnings = set(re.findall(r'security\.W\d+', result.stderr))
assert warnings == {'security.W005', 'security.W021'}, result.stderr
print('Only the two intentional HSTS subdomain/preload advisories remain.')
for label, overrides in [
    ('weak secret', {'SECRET_KEY': 'short'}),
    ('wildcard hosts', {'ALLOWED_HOSTS': '*'}),
    ('HTTP origin', {'SITE_ORIGIN': 'http://plansoko.example.com'}),
    ('overlapping storage', {'PRIVATE_MEDIA_ROOT': environment['MEDIA_ROOT']}),
    ('relative storage', {'MEDIA_ROOT': 'media'}),
    ('missing database password', {'DB_PASSWORD': ''}),
    ('wrong enabled callback', {'PAYMENT_INITIATION_ENABLED': 'True', 'MPESA_CALLBACK_URL': 'https://wrong.example.com/callback/'}),
]:
    result = subprocess.run(command, cwd=draft, env={**environment, **overrides}, capture_output=True, text=True)
    if result.returncode == 0:
        raise AssertionError(f'Unsafe configuration accepted: {label}')
    print(f'Rejected {label}.')
print('Production configuration and seven rejection checks passed; no database connection or provider call made.')

