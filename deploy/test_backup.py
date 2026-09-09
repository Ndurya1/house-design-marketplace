import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import types
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('deployment_backup', Path(__file__).with_name('backup.py'))
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)


class BackupTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.public = self.root / 'public'
        self.private = self.root / 'private'
        self.public.mkdir()
        self.private.mkdir()
        (self.public / 'preview.png').write_bytes(b'test image')
        (self.private / 'plan.pdf').write_bytes(b'test private plan')
        self.settings = types.SimpleNamespace(
            MEDIA_ROOT=self.public, PRIVATE_MEDIA_ROOT=self.private,
            DATABASES={'default': {'ENGINE': 'django.db.backends.postgresql',
                'HOST': 'test-host', 'PORT': '5432', 'USER': 'test-user',
                'PASSWORD': 'test-only-password', 'NAME': 'test-only-database',
                'OPTIONS': {'sslmode': 'verify-full'}}})
        django = types.ModuleType('django')
        django.setup = lambda: None
        conf = types.ModuleType('django.conf')
        conf.settings = self.settings
        self.enterContext(patch.dict(sys.modules, {'django': django, 'django.conf': conf}))
        self.enterContext(patch.dict(os.environ, {'DJANGO_SETTINGS_MODULE': 'test.settings'}))
        self.enterContext(contextlib.redirect_stdout(io.StringIO()))
        self.enterContext(contextlib.redirect_stderr(io.StringIO()))

    def run_backup(self, destination, confirmed=True):
        arguments = ['backup.py', str(destination)] + (['--writes-stopped'] if confirmed else [])
        with patch.object(sys, 'argv', arguments):
            backup.main()

    def test_confirmation_required_before_any_dump(self):
        with patch.object(backup.subprocess, 'run') as run:
            with self.assertRaises(SystemExit):
                self.run_backup(self.root / 'snapshot', confirmed=False)
            run.assert_not_called()

    def test_media_destination_rejected(self):
        with patch.object(backup.subprocess, 'run') as run:
            with self.assertRaises(SystemExit):
                self.run_backup(self.private / 'snapshot')
            run.assert_not_called()

    def test_existing_destination_is_not_overwritten(self):
        destination = self.root / 'snapshot'
        destination.mkdir()
        with patch.object(backup.subprocess, 'run') as run:
            with self.assertRaises(FileExistsError):
                self.run_backup(destination)
            run.assert_not_called()

    def test_dump_failure_never_produces_completed_manifest(self):
        destination = self.root / 'snapshot'
        with patch.object(backup.subprocess, 'run', side_effect=subprocess.CalledProcessError(1, 'pg_dump')):
            with self.assertRaises(subprocess.CalledProcessError):
                self.run_backup(destination)
        self.assertFalse((destination / 'manifest.json').exists())

    def test_archive_and_manifest_contain_both_media_roots(self):
        destination = self.root / 'snapshot'

        def fake_dump(command, **kwargs):
            self.assertNotIn('test-only-password', ' '.join(command))
            self.assertEqual(kwargs['env']['PGDATABASE'], 'test-only-database')
            self.assertEqual(kwargs['env']['PGSSLMODE'], 'verify-full')
            Path(command[-1]).write_bytes(b'fake database dump')

        with patch.object(backup.subprocess, 'run', side_effect=fake_dump):
            self.run_backup(destination)
        manifest = json.loads((destination / 'manifest.json').read_text())
        for name, digest in manifest['files'].items():
            self.assertEqual(hashlib.sha256((destination / name).read_bytes()).hexdigest(), digest)
        with tarfile.open(destination / 'media.tar.gz') as archive:
            self.assertIn('public/preview.png', archive.getnames())
            self.assertIn('private/plan.pdf', archive.getnames())
        self.assertNotIn('test-only-password', (destination / 'manifest.json').read_text())


if __name__ == '__main__':
    unittest.main()
