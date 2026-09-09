from uuid import uuid4

from django.db import models
from orders.models import ImmutableSnapshot, Orders


class PaymentAttempt(ImmutableSnapshot):
    class Status(models.TextChoices):
        INITIATING = 'initiating', 'Initiating'
        PENDING = 'pending', 'Awaiting payment confirmation'
        REJECTED = 'rejected', 'Initiation rejected'
        UNKNOWN = 'unknown', 'Needs reconciliation'
        SUCCEEDED = 'succeeded', 'Payment confirmed'
        FAILED = 'failed', 'Payment failed'

    reference = models.UUIDField(default=uuid4, unique=True, editable=False)
    order = models.ForeignKey(Orders, on_delete=models.PROTECT, related_name='payment_attempts')
    idempotency_key = models.UUIDField()
    amount = models.DecimalField(max_digits=21, decimal_places=4)
    phone = models.CharField(max_length=15)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.INITIATING)
    merchant_request_id = models.CharField(max_length=128, blank=True)
    checkout_request_id = models.CharField(max_length=128, null=True, blank=True, unique=True)
    receipt_number = models.CharField(max_length=32, unique=True, null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    error_code = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    snapshot_fields = ('reference', 'order_id', 'idempotency_key', 'amount', 'phone', 'created_at')

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['order', 'idempotency_key'], name='payment_order_idempotency'),
            models.UniqueConstraint(fields=['order'], condition=models.Q(status__in=['initiating', 'pending', 'unknown']),
                                    name='payment_one_active_order'),
            models.CheckConstraint(condition=models.Q(amount__gt=0), name='payment_positive_amount'),
        ]

    def __str__(self):
        return f'{self.reference} ({self.status})'


class PaymentCallbackEvent(models.Model):
    fingerprint = models.CharField(max_length=64, unique=True)
    merchant_request_id = models.CharField(max_length=128)
    checkout_request_id = models.CharField(max_length=128, db_index=True)
    result_code = models.IntegerField()
    amount = models.DecimalField(max_digits=21, decimal_places=4, null=True)
    phone = models.CharField(max_length=15, blank=True)
    receipt_number = models.CharField(max_length=32, blank=True)
    transaction_date = models.CharField(max_length=14, blank=True)
    status = models.CharField(max_length=16, default='received')
    error_code = models.CharField(max_length=64, blank=True)
    verified_result_code = models.IntegerField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    checked_at = models.DateTimeField(null=True)
