import hashlib
import json
import re
from decimal import Decimal, InvalidOperation

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from orders.models import Orders, DownloadGrant
from .gateway import DarajaGateway, PaymentUnavailable
from .models import PaymentAttempt, PaymentCallbackEvent


def normalize_callback(data):
    try:
        callback = data['Body']['stkCallback']
        merchant, checkout, result = callback['MerchantRequestID'], callback['CheckoutRequestID'], callback['ResultCode']
        if not all(isinstance(value, str) and re.fullmatch(r'[A-Za-z0-9_.-]{1,128}', value) for value in [merchant, checkout]):
            raise ValueError()
        if isinstance(result, bool) or not re.fullmatch(r'[0-9]{1,6}', str(result)):
            raise ValueError()
        result = int(result)
        normalized = dict(merchant_request_id=merchant, checkout_request_id=checkout, result_code=result,
                          amount=None, phone='', receipt_number='', transaction_date='')
        if result == 0:
            entries = callback['CallbackMetadata']['Item']
            if not isinstance(entries, list) or len(entries) > 20:
                raise ValueError()
            metadata = {}
            for entry in entries:
                name = entry['Name']
                if not isinstance(name, str) or name in metadata:
                    raise ValueError()
                metadata[name] = entry.get('Value')
            amount = Decimal(str(metadata['Amount']))
            if not amount.is_finite() or amount <= 0 or amount >= Decimal('1e17') or amount.as_tuple().exponent < -4:
                raise ValueError()
            phone = str(metadata['PhoneNumber'])
            receipt = metadata['MpesaReceiptNumber']
            date = str(metadata['TransactionDate'])
            if not re.fullmatch(r'254[17][0-9]{8}', phone):
                raise ValueError()
            if not isinstance(receipt, str) or not re.fullmatch(r'[A-Z0-9]{8,32}', receipt):
                raise ValueError()
            if not re.fullmatch(r'[0-9]{14}', date):
                raise ValueError()
            normalized.update(amount=format(amount, '.4f'), phone='+' + phone, receipt_number=receipt, transaction_date=date)
        return normalized
    except (KeyError, TypeError, ValueError, InvalidOperation):
        raise ValidationError({'detail': 'Invalid payment callback.'})


def store_callback(data):
    normalized = normalize_callback(data)
    fingerprint = hashlib.sha256(json.dumps(normalized, sort_keys=True).encode()).hexdigest()
    event, _ = PaymentCallbackEvent.objects.get_or_create(fingerprint=fingerprint, defaults=normalized)
    return event


def set_event_state(event, state, error=''):
    PaymentCallbackEvent.objects.filter(pk=event.pk).exclude(status='processed').update(status=state, error_code=error, checked_at=timezone.now())


def reconcile_event(event_id):
    event = PaymentCallbackEvent.objects.get(pk=event_id)
    if event.status == 'processed':
        return 'processed'
    attempt = PaymentAttempt.objects.filter(checkout_request_id=event.checkout_request_id).first()
    if not attempt:
        set_event_state(event, 'unmatched', 'unknown_checkout')
        return 'unmatched'
    if event.merchant_request_id != attempt.merchant_request_id:
        set_event_state(event, 'conflict', 'merchant_mismatch')
        return 'conflict'
    if event.result_code == 0 and (event.amount != attempt.amount or event.phone != attempt.phone):
        set_event_state(event, 'conflict', 'payment_metadata_mismatch')
        return 'conflict'
    # Network verification is outside locks; the result is rechecked under locks below.
    try:
        verified_code = DarajaGateway().query_payment(attempt.checkout_request_id, attempt.merchant_request_id)
    except PaymentUnavailable:
        verified_code = None
    if verified_code is None:
        set_event_state(event, 'unresolved', 'query_unavailable')
        return 'unresolved'
    try:
        with transaction.atomic():
            order = Orders.objects.select_for_update().get(pk=attempt.order_id)
            attempt = PaymentAttempt.objects.select_for_update().get(pk=attempt.pk)
            event = PaymentCallbackEvent.objects.select_for_update().get(pk=event.pk)
            if event.status == 'processed':
                return 'processed'
            event.verified_result_code = verified_code
            event.save(update_fields=['verified_result_code'])
            conflict = PaymentCallbackEvent.objects.filter(checkout_request_id=event.checkout_request_id).exclude(fingerprint=event.fingerprint).exists()
            if (conflict or verified_code != event.result_code or order.is_legacy
                    or attempt.amount != order.total or order.status == 'cancelled'
                    or attempt.merchant_request_id != event.merchant_request_id
                    or attempt.checkout_request_id != event.checkout_request_id):
                set_event_state(event, 'conflict', 'conflicting_evidence')
                return 'conflict'
            if attempt.status in ['succeeded', 'failed']:
                same = (verified_code == 0 and attempt.status == 'succeeded' and attempt.receipt_number == event.receipt_number) or (verified_code != 0 and attempt.status == 'failed')
                set_event_state(event, 'processed' if same else 'conflict', '' if same else 'terminal_state_conflict')
                return 'processed' if same else 'conflict'
            if attempt.status == 'rejected' or (order.status == 'completed' and attempt.status != 'succeeded'):
                set_event_state(event, 'conflict', 'order_state_conflict')
                return 'conflict'
            if verified_code == 0:
                attempt.status = 'succeeded'
                attempt.receipt_number = event.receipt_number
                attempt.confirmed_at = timezone.now()
                attempt.error_code = ''
                attempt.save(update_fields=['status', 'receipt_number', 'confirmed_at', 'error_code', 'updated_at'])
                order.status = 'completed'
                order.save(update_fields=['status', 'updated_at'])
                for item in order.items.select_related('file_snapshot'):
                    if hasattr(item, 'file_snapshot'):
                        DownloadGrant.objects.get_or_create(snapshot=item.file_snapshot, defaults={'payment': attempt})
            else:
                attempt.status = 'failed'
                attempt.error_code = 'result_' + str(verified_code)
                attempt.save(update_fields=['status', 'error_code', 'updated_at'])
            set_event_state(event, 'processed')
            return 'processed'
    except IntegrityError:
        set_event_state(event, 'conflict', 'receipt_or_grant_conflict')
        return 'conflict'
