from catalogue.storage import private_plan_storage
from uuid import uuid4

from django.core.exceptions import ValidationError
from django.db import models


class ImmutableSnapshot(models.Model):
    snapshot_fields = ()

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self._state.adding:
            original = type(self).objects.using(kwargs.get('using') or self._state.db).get(pk=self.pk)
            changed = [field for field in self.snapshot_fields
                       if getattr(self, field) != getattr(original, field)]
            if changed:
                raise ValidationError({field: 'Order snapshots cannot be changed.' for field in changed})
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError('Order history cannot be deleted.')


class Orders(ImmutableSnapshot):
    class OrderStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'

    reference = models.UUIDField(default=uuid4, unique=True, editable=False)
    status = models.CharField(max_length=10, choices=OrderStatus.choices, default=OrderStatus.PENDING)
    buyer = models.ForeignKey('users.Buyer', on_delete=models.SET_NULL, blank=True, null=True)
    guest_email = models.EmailField(blank=True)
    guest_phone = models.CharField(max_length=15, blank=True)
    currency = models.CharField(max_length=3, default='KES', editable=False)
    total = models.DecimalField(max_digits=21, decimal_places=4, null=True)
    is_legacy = models.BooleanField(default=False, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, blank=True, null=True)

    snapshot_fields = ('reference', 'buyer_id', 'guest_email', 'guest_phone', 'currency',
                       'total', 'is_legacy', 'created_at')

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(currency='KES'), name='orders_currency_kes'),
            models.CheckConstraint(condition=models.Q(total__isnull=True, is_legacy=True) |
                                   models.Q(total__isnull=False, total__gt=0), name='orders_valid_total'),
        ]

    def __str__(self):
        return f'Order {self.reference}'


class OrderItem(ImmutableSnapshot):
    order = models.ForeignKey(Orders, on_delete=models.PROTECT, related_name='items')
    plan = models.ForeignKey('catalogue.Catalogue', on_delete=models.SET_NULL, null=True, blank=True)
    seller = models.ForeignKey('users.SellerProfile', on_delete=models.SET_NULL, null=True, blank=True)
    plan_id_snapshot = models.PositiveBigIntegerField()
    seller_id_snapshot = models.PositiveBigIntegerField(null=True)
    title_snapshot = models.CharField(max_length=200)
    seller_name_snapshot = models.CharField(max_length=255, blank=True)
    unit_price = models.DecimalField(max_digits=19, decimal_places=4, null=True)

    snapshot_fields = ('order_id', 'plan_id', 'seller_id', 'plan_id_snapshot', 'seller_id_snapshot',
                       'title_snapshot', 'seller_name_snapshot', 'unit_price')

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['order', 'plan_id_snapshot'], name='order_unique_plan'),
            models.CheckConstraint(condition=models.Q(unit_price__isnull=True) |
                                   models.Q(unit_price__gt=0), name='order_item_positive_price'),
        ]

    def __str__(self):
        return self.title_snapshot


class payments(models.Model):
    # Retained for existing payment-method records; actual payment attempts follow in Task 8.
    class paymentsChoices(models.TextChoices):
        MPESA = 'MPESA', 'MPESA'
        CARD = 'CARD', 'Card'

    orders = models.ForeignKey(Orders, on_delete=models.PROTECT)
    payment_method = models.CharField(choices=paymentsChoices.choices, default=paymentsChoices.MPESA, max_length=10)

    def __str__(self):
        return f'Payment {self.pk}'


class OrderFileSnapshot(ImmutableSnapshot):

    order_item = models.OneToOneField(OrderItem, on_delete=models.PROTECT, related_name='file_snapshot')
    file = models.FileField(storage=private_plan_storage, max_length=255)
    sha256 = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    snapshot_fields = ('order_item_id', 'file', 'sha256', 'created_at')


class DownloadGrant(models.Model):
    reference = models.UUIDField(default=uuid4, unique=True, editable=False)
    snapshot = models.OneToOneField(OrderFileSnapshot, on_delete=models.PROTECT, related_name='grant')
    payment = models.ForeignKey('payments.PaymentAttempt', on_delete=models.PROTECT, related_name='download_grants')
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
