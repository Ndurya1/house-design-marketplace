import re

from django.conf import settings
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError

from orders.checkout_tokens import validate_checkout_token
from orders.models import Orders
from users.models import User
from .gateway import DarajaGateway, InitiationOutcome, PaymentUnavailable
from .models import PaymentAttempt


class PaymentConflict(APIException):
    status_code = 409
    default_detail = 'An existing payment attempt must be resolved before trying again.'


def authorize_payment(user, token, order):
    is_buyer = (user.is_authenticated and user.role == User.UserChoices.BUYER
                and order.buyer_id and order.buyer.user_id == user.pk)
    if not is_buyer and not validate_checkout_token(token, order):
        raise PermissionDenied('A valid checkout token or the owning buyer account is required.')


def validate_payable_order(order):
    if order.is_legacy or order.status != Orders.OrderStatus.PENDING or order.currency != 'KES':
        raise ValidationError({'order_reference': 'This order cannot be paid.'})
    if order.total is None or order.total <= 0 or order.total != order.total.to_integral_value():
        raise ValidationError({'order_reference': 'M-Pesa requires a positive whole-shilling order total; prices will not be rounded.'})
    if not order.items.exists() or order.items.filter(file_snapshot__isnull=True).exists():
        raise ValidationError({'order_reference': 'This order has no reliable purchased-file snapshot.'})
    if not re.fullmatch(r'\+254[17][0-9]{8}', order.guest_phone):
        raise ValidationError({'order_reference': 'The order does not have a valid payment phone number.'})


def initiate_payment(*, user, checkout_token, order_reference, idempotency_key):
    if not settings.PAYMENT_INITIATION_ENABLED:
        raise PaymentUnavailable()
    gateway = DarajaGateway()
    # Durable atomic prevents an outer application transaction from spanning network I/O.
    with transaction.atomic(durable=True):
        order = get_object_or_404(Orders.objects.select_for_update(), reference=order_reference)
        authorize_payment(user, checkout_token, order)
        existing = PaymentAttempt.objects.filter(order=order, idempotency_key=idempotency_key).first()
        if existing:
            return existing
        validate_payable_order(order)
        if PaymentAttempt.objects.filter(order=order, status__in=['initiating', 'pending', 'unknown']).exists():
            raise PaymentConflict()
        gateway.validate_configuration()
        attempt = PaymentAttempt.objects.create(order=order, idempotency_key=idempotency_key,
                                                amount=order.total, phone=order.guest_phone)
    try:
        outcome = gateway.initiate(attempt)
    except Exception:
        # An unexpected adapter failure must not release an already reserved request.
        outcome = InitiationOutcome('unknown', 'gateway_failure')
    record_initiation_outcome(attempt, outcome)
    attempt.refresh_from_db()
    return attempt


def record_initiation_outcome(attempt, outcome):
    updates = dict(status=outcome.status, error_code=outcome.error_code,
                   merchant_request_id=outcome.merchant_request_id,
                   checkout_request_id=outcome.checkout_request_id, updated_at=timezone.now())
    try:
        with transaction.atomic():
            # A later callback/reconciliation state must never be overwritten by a slow initiation response.
            PaymentAttempt.objects.filter(pk=attempt.pk, status='initiating').update(**updates)
    except IntegrityError:
        PaymentAttempt.objects.filter(pk=attempt.pk, status='initiating').update(
            status='unknown', error_code='provider_id_conflict', updated_at=timezone.now())
