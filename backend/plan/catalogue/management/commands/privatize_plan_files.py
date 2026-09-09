import hashlib
import shutil
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from catalogue.models import Catalogue


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').digest()


def contained_path(root, name):
    root = Path(root).resolve()
    target = (root / name).resolve()
    if target == root or not target.is_relative_to(root):
        raise CommandError('A file path escapes its storage directory.')
    return target


class Command(BaseCommand):
    help = 'Copy referenced plans to private storage, verify, then remove public copies.'

    def handle(self, *args, **options):
        public_root = Path(settings.MEDIA_ROOT).resolve()
        private_root = Path(settings.PRIVATE_MEDIA_ROOT).resolve()
        if private_root == public_root or private_root.is_relative_to(public_root):
            raise CommandError('Private storage must be outside public media.')
        failures = []
        names = Catalogue.objects.exclude(plan_file='').exclude(
            plan_file=None
        ).values_list('plan_file', flat=True).distinct()
        for name in names:
            source = contained_path(public_root, name)
            destination = contained_path(private_root, name)
            if not source.exists():
                if not destination.is_file():
                    failures.append(f'Missing file: {name}')
                continue
            destination.parent.mkdir(parents=True, exist_ok=True)
            if destination.exists():
                if digest(source) != digest(destination):
                    failures.append(f'Conflicting private file: {name}')
                    continue
            else:
                with source.open('rb') as input_file, destination.open('xb') as output_file:
                    shutil.copyfileobj(input_file, output_file)
            if digest(source) != digest(destination):
                failures.append(f'Copy verification failed: {name}')
                continue
            source.unlink()
            self.stdout.write(f'Privatized: {name}')
        if failures:
            raise CommandError('\n'.join(failures))
        self.stdout.write(self.style.SUCCESS('All referenced plan files are private.'))
