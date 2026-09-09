from django.core.management.base import BaseCommand
from django.db.models import F
from payments.callbacks import reconcile_event
from payments.models import PaymentCallbackEvent


class Command(BaseCommand):
    help = 'Match stored callbacks and verify their checkout status with Daraja.'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=100)

    def handle(self, *args, **options):
        events = PaymentCallbackEvent.objects.filter(status__in=['received', 'unmatched', 'unresolved']).order_by(F('checked_at').asc(nulls_first=True), 'pk')[:max(0, min(options['limit'], 1000))]
        for event in events:
            self.stdout.write(f'Event {event.pk}: {reconcile_event(event.pk)}')
