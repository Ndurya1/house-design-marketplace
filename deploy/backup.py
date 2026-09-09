"""Offline application snapshot. Load DJANGO_SETTINGS_MODULE and its environment first."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
from datetime import datetime, timezone


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('destination', type=Path)
    parser.add_argument('--writes-stopped', action='store_true',
                        help='Confirm web processes, workers and all other writers are stopped.')
    args = parser.parse_args()
    if not args.writes_stopped:
        parser.error('Stop all application writers before creating a coordinated backup.')
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend/plan'))
    if not os.getenv('DJANGO_SETTINGS_MODULE'):
        parser.error('Set DJANGO_SETTINGS_MODULE explicitly.')
    import django
    django.setup()
    from django.conf import settings
    database = settings.DATABASES['default']
    if database['ENGINE'] != 'django.db.backends.postgresql':
        parser.error('This backup requires PostgreSQL.')
    roots = {'public': Path(settings.MEDIA_ROOT).resolve(), 'private': Path(settings.PRIVATE_MEDIA_ROOT).resolve()}
    destination = args.destination.resolve()
    if any(destination == path or path in destination.parents for path in roots.values()):
        parser.error('The backup destination must be outside media storage.')
    if any(not path.is_dir() for path in roots.values()):
        parser.error('Both media directories must exist; refusing an incomplete backup.')
    destination.mkdir(mode=0o700, parents=True, exist_ok=False)
    environment = os.environ.copy()
    for key, field in [('PGHOST', 'HOST'), ('PGPORT', 'PORT'), ('PGUSER', 'USER'), ('PGPASSWORD', 'PASSWORD'), ('PGDATABASE', 'NAME')]:
        environment[key] = str(database[field])
    for key in ['sslmode', 'sslrootcert', 'sslcert', 'sslkey']:
        if key in database.get('OPTIONS', {}):
            environment['PG' + key.upper()] = str(database['OPTIONS'][key])
    subprocess.run(['pg_dump', '--no-password', '--format=custom', '--no-owner', '--no-acl',
                    '--file', str(destination / 'database.dump')], env=environment, check=True)
    with tarfile.open(destination / 'media.tar.gz', 'w:gz') as archive:
        for name, directory in roots.items():
            for path in [directory, *directory.rglob('*')]:
                if path.is_symlink() or path.is_junction() or (not path.is_file() and not path.is_dir()):
                    raise RuntimeError('Media contains a link or special file; inspect before backing up.')
                archive.add(path, arcname=str(Path(name) / path.relative_to(directory)), recursive=False)
    manifest = {'created_at': datetime.now(timezone.utc).isoformat(),
                'files': {name: digest(destination / name) for name in ['database.dump', 'media.tar.gz']}}
    (destination / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print('Backup complete. Protect this directory; it contains customer and purchased-file data.')


if __name__ == '__main__':
    main()
