import hashlib
from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from uuid import uuid4

import requests
from django.core.management import call_command
from django.test import TestCase, SimpleTestCase, TransactionTestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from catalogue.models import Catalogue, Category
from orders.checkout_tokens import issue_checkout_token, issue_session_token, issue_download_token
from orders.models import Orders, OrderFileSnapshot, DownloadGrant
from orders.services import create_guest_order
from users.models import User, Buyer
from .callbacks import reconcile_event, store_callback
from .gateway import DarajaGateway
from .models import PaymentAttempt, PaymentCallbackEvent
from .tests import PAYMENT_SETTINGS
from . import tests as payment_tests


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class FulfilmentTests(TestCase):
    def setUp(self):
        self.root = Path(self.enterContext(TemporaryDirectory()))
        self.enterContext(override_settings(PRIVATE_MEDIA_ROOT=str(self.root)))
        (self.root / 'plan_files').mkdir()
        self.original = b'%PDF-1.4 purchased original'
        (self.root / 'plan_files/plan.pdf').write_bytes(self.original)
        seller = User.objects.create_user(username='seller', email='seller@example.com', role='seller')
        category = Category.objects.create(name='Homes', group='residential')
        self.plan = Catalogue.objects.create(title='Original plan', category=category, seller=seller.sellerprofile,
                                             price=1000, status='published', plan_file='plan_files/plan.pdf')
        self.client = APIClient()
        self.order = self.new_order()
        self.attempt = self.new_attempt(self.order, 'checkout')
        self.session = issue_session_token(self.order)
        self.query = self.enterContext(patch('payments.callbacks.DarajaGateway.query_payment', return_value=0))

    def new_order(self):
        return create_guest_order(guest_email='guest@example.com', guest_phone='+254712345678', plan_ids=[self.plan.pk])

    def new_attempt(self, order, checkout):
        return PaymentAttempt.objects.create(order=order, amount=order.total, phone=order.guest_phone,
            idempotency_key=uuid4(), status='pending', checkout_request_id=checkout, merchant_request_id='merchant')

    def payload(self, code=0, checkout='checkout', receipt='ABC1234567'):
        callback = dict(MerchantRequestID='merchant', CheckoutRequestID=checkout, ResultCode=code)
        if code == 0:
            callback['CallbackMetadata'] = {'Item': [
                {'Name': 'Amount', 'Value': 1000}, {'Name': 'MpesaReceiptNumber', 'Value': receipt},
                {'Name': 'TransactionDate', 'Value': 20260907120000}, {'Name': 'PhoneNumber', 'Value': 254712345678}]}
        return {'Body': {'stkCallback': callback}}

    def event(self, **kwargs):
        return store_callback(self.payload(**kwargs))

    def confirm(self):
        self.assertEqual(reconcile_event(self.event().pk), 'processed')
        return DownloadGrant.objects.get(payment=self.attempt)

    def status(self, token=None):
        return self.client.get(reverse('checkout-status', args=[self.order.reference]),
                               HTTP_X_CHECKOUT_SESSION=self.session if token is None else token)

    def download(self, grant, token=None):
        return self.client.get(reverse('purchased-download', args=[grant.reference]),
                               HTTP_X_DOWNLOAD_TOKEN=issue_download_token(grant) if token is None else token)

    def test_callback_receipt_does_not_unlock_and_duplicate_is_idempotent(self):
        payload = self.payload()
        for _ in range(2):
            response = self.client.post(reverse('payment-callback'), payload, format='json')
            self.assertEqual(response.status_code, 200, response.data)
        payload['Body']['stkCallback']['CallbackMetadata']['Item'].reverse()
        self.client.post(reverse('payment-callback'), payload, format='json')
        self.assertEqual(PaymentCallbackEvent.objects.count(), 1)
        self.query.assert_not_called()
        self.assertFalse(DownloadGrant.objects.exists())
        grant = self.confirm()
        self.assertEqual(reconcile_event(PaymentCallbackEvent.objects.get().pk), 'processed')
        self.assertEqual(DownloadGrant.objects.count(), 1)
        self.order.refresh_from_db(); self.attempt.refresh_from_db()
        self.assertEqual(self.order.status, 'completed')
        self.assertEqual(self.attempt.receipt_number, 'ABC1234567')
        self.assertEqual(self.status().data['status'], 'paid')
        token_response = self.client.post(reverse('download-token', args=[grant.reference]), HTTP_X_CHECKOUT_SESSION=self.session)
        self.assertEqual(token_response.status_code, 200)
        response = self.download(grant, token_response.data['download_token'])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(b''.join(response.streaming_content), self.original)
        self.assertIn('no-store', response['Cache-Control'])
        self.assertIn('attachment', response['Content-Disposition'])

    def test_receipt_requires_verified_payment_and_scoped_authorization(self):
        url = reverse('checkout-receipt', args=[self.order.reference])
        self.assertEqual(self.client.get(url, HTTP_X_CHECKOUT_SESSION=self.session).status_code, 403)
        self.event()
        self.assertEqual(self.client.get(url, HTTP_X_CHECKOUT_SESSION=self.session).status_code, 403)
        grant = self.confirm()
        self.assertIn(self.client.get(url).status_code, [401, 403])
        for token in [issue_checkout_token(self.order), issue_download_token(grant), issue_session_token(self.new_order())]:
            self.assertEqual(self.client.get(url, HTTP_X_CHECKOUT_SESSION=token).status_code, 403)
        with override_settings(CHECKOUT_SESSION_MAX_AGE=-1):
            self.assertEqual(self.client.get(url, HTTP_X_CHECKOUT_SESSION=self.session).status_code, 403)
        response = self.client.get(url, HTTP_X_CHECKOUT_SESSION=self.session)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['mpesa_receipt'], 'ABC1234567')
        self.assertIn('no-store', response['Cache-Control'])
        self.assertNotIn('checkout_session', response.data)

    def test_receipt_uses_purchase_snapshots_after_catalogue_changes(self):
        self.confirm()
        url = reverse('checkout-receipt', args=[self.order.reference])
        before = self.client.get(url, HTTP_X_CHECKOUT_SESSION=self.session).data
        self.plan.title = 'Replacement title'
        self.plan.price = 9999
        self.plan.save()
        self.plan.delete()
        after = self.client.get(url, HTTP_X_CHECKOUT_SESSION=self.session).data
        self.assertEqual(after, before)
        self.assertEqual(after['items'][0]['title'], 'Original plan')
        self.assertEqual(after['total'], '1000.0000')

    def test_receipt_allows_owning_buyer_but_not_another_buyer(self):
        owner = User.objects.create_user(username='receipt-owner', email='owner@example.com', role='buyer')
        order = create_guest_order(guest_email='owner@example.com', guest_phone='+254712345678',
                                   plan_ids=[self.plan.pk], buyer_user=owner)
        self.order = order
        self.attempt = self.new_attempt(order, 'owner-checkout')
        event = self.event(checkout='owner-checkout')
        self.assertEqual(reconcile_event(event.pk), 'processed')
        url = reverse('checkout-receipt', args=[order.reference])
        self.client.force_authenticate(owner)
        self.assertEqual(self.client.get(url).status_code, 200)
        other = User.objects.create_user(username='receipt-other', email='other@example.com', role='buyer')
        self.client.force_authenticate(other)
        self.assertEqual(self.client.get(url).status_code, 403)

    def test_cancelled_and_unverified_completed_orders_are_not_payable_in_ui(self):
        self.order.status = 'cancelled'
        self.order.save(update_fields=['status'])
        self.assertEqual(self.status().data['status'], 'cancelled')
        self.order.status = 'completed'
        self.order.save(update_fields=['status'])
        self.assertEqual(self.status().data['status'], 'needs_support')

    def test_suspension_keeps_paid_download_and_admin_history_read_only(self):
        from users.operations import set_designer_active
        operator = User.objects.create_superuser(
            username='operator', email='operator@example.com', password='test-password')
        grant = self.confirm()
        set_designer_active(actor=operator, designer_id=self.plan.seller.user_id, active=False)
        self.assertEqual(self.status().data['status'], 'paid')
        response = self.download(grant)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(b''.join(response.streaming_content), self.original)

        self.client.force_login(operator)
        order_url = reverse('admin:orders_orders_change', args=[self.order.pk])
        attempt_url = reverse('admin:payments_paymentattempt_change', args=[self.attempt.pk])
        self.assertContains(self.client.get(order_url), 'View payment attempts')
        self.assertContains(self.client.get(attempt_url), 'View callback evidence')
        callback_url = reverse('admin:payments_paymentcallbackevent_changelist')
        self.assertEqual(self.client.get(callback_url, {'checkout_request_id__exact': 'checkout'}).status_code, 200)
        self.assertEqual(self.client.post(attempt_url, {'status': 'failed'}).status_code, 403)
        self.attempt.refresh_from_db()
        self.assertEqual(self.attempt.status, 'succeeded')

    def test_file_is_independent_of_later_catalogue_edits_and_deletion(self):
        snapshot = OrderFileSnapshot.objects.get()
        self.assertTrue(snapshot.file.name.startswith('order_files/'))
        self.assertEqual(snapshot.sha256, hashlib.sha256(self.original).hexdigest())
        (self.root / 'plan_files/plan.pdf').write_bytes(b'replacement')
        self.plan.delete()
        response = self.download(self.confirm())
        self.assertEqual(b''.join(response.streaming_content), self.original)

    def test_wrong_purpose_order_grant_and_expired_credentials(self):
        other = self.new_order()
        for token in ['', 'invalid', issue_checkout_token(self.order), issue_session_token(other)]:
            self.assertEqual(self.status(token).status_code, 403)
        with patch('django.core.signing.time.time', return_value=1000):
            expired = issue_session_token(self.order)
        self.assertEqual(self.status(expired).status_code, 403)
        grant = self.confirm()
        other_attempt = self.new_attempt(other, 'other-checkout')
        other_grant = DownloadGrant.objects.create(snapshot=other.items.first().file_snapshot, payment=other_attempt)
        for token in ['', self.session, issue_checkout_token(self.order), issue_download_token(other_grant)]:
            self.assertEqual(self.download(grant, token).status_code, 403)
        with patch('django.core.signing.time.time', return_value=1000):
            expired = issue_download_token(grant)
        self.assertEqual(self.download(grant, expired).status_code, 403)
        self.assertEqual(self.client.post(reverse('download-token', args=[grant.reference]),
            HTTP_X_CHECKOUT_SESSION=issue_session_token(other)).status_code, 403)

    def test_buyer_access_is_scoped_and_guest_token_not_on_history(self):
        owner = User.objects.create_user(username='buyer', email='buyer@example.com', role='buyer')
        buyer = Buyer.objects.create(user=owner, phone='0712345678')
        Orders.objects.filter(pk=self.order.pk).update(buyer=buyer)
        grant = self.confirm()
        self.client.force_authenticate(owner)
        self.assertEqual(self.status('').status_code, 200)
        response = self.download(grant, '')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(b''.join(response.streaming_content), self.original)
        data = self.client.get(reverse('orders-detail', args=[self.order.reference])).data
        self.assertNotIn('checkout_session', data)
        self.client.force_authenticate(self.plan.seller.user)
        self.assertEqual(self.status('').status_code, 403)
        self.assertEqual(self.download(grant, '').status_code, 403)

    def test_revoked_missing_or_corrupt_file_never_requests_repayment(self):
        grant = self.confirm()
        token = issue_download_token(grant)
        path = self.root / grant.snapshot.file.name
        for action in ['corrupt', 'missing']:
            if action == 'corrupt': path.write_bytes(b'wrong file')
            else: path.unlink()
            self.assertEqual(self.download(grant, token).status_code, 503)
            data = self.status().data
            self.assertEqual(data['status'], 'paid')
            self.assertFalse(data['items'][0]['download_available'])
        path.write_bytes(self.original)
        DownloadGrant.objects.filter(pk=grant.pk).update(revoked_at=timezone.now())
        self.assertEqual(self.download(grant, token).status_code, 403)
        self.assertEqual(self.client.post(reverse('download-token', args=[grant.reference]), HTTP_X_CHECKOUT_SESSION=self.session).status_code, 403)

    def test_unpaid_grant_cannot_authorize_download(self):
        grant = DownloadGrant.objects.create(snapshot=self.order.items.first().file_snapshot, payment=self.attempt)
        self.assertEqual(self.download(grant).status_code, 403)

    def test_early_callback_is_retained_and_retried_by_command(self):
        PaymentAttempt.objects.filter(pk=self.attempt.pk).update(checkout_request_id=None, merchant_request_id='')
        event = self.event()
        self.assertEqual(reconcile_event(event.pk), 'unmatched')
        self.query.assert_not_called()
        PaymentAttempt.objects.filter(pk=self.attempt.pk).update(checkout_request_id='checkout', merchant_request_id='merchant')
        call_command('reconcile_payments', stdout=StringIO())
        self.assertTrue(DownloadGrant.objects.exists())

    def test_new_callbacks_are_not_starved_by_unresolved_events(self):
        old = self.event(checkout='unknown-checkout')
        reconcile_event(old.pk)
        new = self.event()
        call_command('reconcile_payments', limit=1, stdout=StringIO())
        new.refresh_from_db()
        self.assertEqual(new.status, 'processed')

    def test_mismatched_amount_phone_or_merchant_never_queries(self):
        for field, value in [('Amount', 1), ('PhoneNumber', 254711111111), ('merchant', 'wrong')]:
            payload = self.payload()
            callback = payload['Body']['stkCallback']
            if field == 'merchant': callback['MerchantRequestID'] = value
            else:
                for item in callback['CallbackMetadata']['Item']:
                    if item['Name'] == field: item['Value'] = value
            self.assertEqual(reconcile_event(store_callback(payload).pk), 'conflict')
        self.query.assert_not_called()
        self.assertFalse(DownloadGrant.objects.exists())

    def test_query_unavailable_or_contradictory_never_unlocks(self):
        event = self.event()
        self.query.return_value = None
        self.assertEqual(reconcile_event(event.pk), 'unresolved')
        self.query.return_value = 1032
        self.assertEqual(reconcile_event(event.pk), 'conflict')
        self.assertFalse(DownloadGrant.objects.exists())
        self.order.refresh_from_db(); self.assertEqual(self.order.status, 'pending')

    def test_conflicting_callbacks_block_unlock(self):
        event = self.event()
        self.event(receipt='DIFFERENT1')
        self.assertEqual(reconcile_event(event.pk), 'conflict')
        self.assertFalse(DownloadGrant.objects.exists())

    def test_late_failure_does_not_downgrade_paid_order(self):
        self.confirm()
        self.query.return_value = 1032
        self.assertEqual(reconcile_event(self.event(code=1032).pk), 'conflict')
        self.assertEqual(self.status().data['status'], 'paid')
        self.attempt.refresh_from_db(); self.assertEqual(self.attempt.status, 'succeeded')

    def test_verified_failure_allows_new_attempt_but_no_download(self):
        self.query.return_value = 1032
        self.assertEqual(reconcile_event(self.event(code=1032).pk), 'processed')
        self.attempt.refresh_from_db(); self.assertEqual(self.attempt.status, 'failed')
        self.assertFalse(DownloadGrant.objects.exists())
        self.new_attempt(self.order, 'retry-checkout')

    def test_receipt_cannot_pay_two_orders(self):
        self.confirm()
        other = self.new_order()
        self.new_attempt(other, 'other-checkout')
        self.assertEqual(reconcile_event(self.event(checkout='other-checkout').pk), 'conflict')
        other.refresh_from_db(); self.assertEqual(other.status, 'pending')
        self.assertEqual(DownloadGrant.objects.count(), 1)

    def test_order_copy_failure_rolls_back_database_and_files(self):
        before = set((self.root / 'order_files').iterdir())
        with patch('orders.services.OrderFileSnapshot.objects.create', side_effect=RuntimeError('database failed')):
            with self.assertRaises(RuntimeError): self.new_order()
        self.assertEqual(Orders.objects.count(), 1)
        self.assertEqual(set((self.root / 'order_files').iterdir()), before)
        (self.root / 'plan_files/plan.pdf').unlink()
        response = self.client.post(reverse('orders-list'), {'guest_email': 'a@example.com', 'guest_phone': '0712345678', 'plan_ids': [self.plan.pk]}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Orders.objects.count(), 1)

    def test_existing_orders_without_file_snapshot_cannot_initiate(self):
        other = Orders.objects.create(total=1000, guest_phone='+254712345678')
        with override_settings(**PAYMENT_SETTINGS), patch('payments.services.DarajaGateway.initiate') as initiate:
            response = self.client.post(reverse('payments'), {'order_reference': str(other.reference), 'idempotency_key': str(uuid4())},
                format='json', HTTP_X_CHECKOUT_TOKEN=issue_checkout_token(other))
        self.assertEqual(response.status_code, 400)
        initiate.assert_not_called()

    def test_malformed_duplicate_metadata_and_oversized_json_rejected(self):
        payload = self.payload()
        entries = payload['Body']['stkCallback']['CallbackMetadata']['Item']
        entries.append(entries[0])
        for data in [{}, {'Body': None}, payload]:
            self.assertEqual(self.client.post(reverse('payment-callback'), data, format='json').status_code, 400)
        for raw in [' ' * 17000, '{"Body":{},"Body":{}}', '[' * 2000 + ']' * 2000]:
            self.assertEqual(self.client.post(reverse('payment-callback'), raw, content_type='application/json').status_code, 400)
        self.assertFalse(PaymentCallbackEvent.objects.exists())


@override_settings(**PAYMENT_SETTINGS)
class PaymentQueryTests(SimpleTestCase):
    setUp = payment_tests.GatewayTests.setUp
    def test_query_only_accepts_matching_identifiers_and_final_result(self):
        data = {'ResponseCode': '0', 'CheckoutRequestID': 'checkout', 'MerchantRequestID': 'merchant', 'ResultCode': '0'}
        self.post.return_value.json.return_value = data
        self.assertEqual(DarajaGateway().query_payment('checkout', 'merchant'), 0)
        self.assertTrue(self.post.call_args.args[0].endswith('/mpesa/stkpushquery/v1/query'))
        self.assertEqual(self.post.call_args.kwargs['json']['CheckoutRequestID'], 'checkout')
        self.assertEqual(self.post.call_args.kwargs['timeout'], (2, 5))
        for field, value in [('CheckoutRequestID', 'other'), ('MerchantRequestID', 'other'), ('ResultCode', None), ('ResultCode', True), ('ResultCode', 4999)]:
            self.post.return_value.json.return_value = {**data, field: value}
            self.assertIsNone(DarajaGateway().query_payment('checkout', 'merchant'))
        self.post.side_effect = requests.Timeout()
        self.assertIsNone(DarajaGateway().query_payment('checkout', 'merchant'))


class CallbackConcurrencyTests(TransactionTestCase):
    def test_concurrent_reconciliation_creates_one_grant(self):
        from concurrent.futures import ThreadPoolExecutor
        from threading import Barrier
        from django.db import close_old_connections, connections
        order = Orders.objects.create(total=1000, guest_phone='+254712345678')
        payment_tests.attach_snapshot(order)
        PaymentAttempt.objects.create(order=order, amount=1000, phone=order.guest_phone, idempotency_key=uuid4(),
                                      status='pending', checkout_request_id='checkout', merchant_request_id='merchant')
        event = store_callback(FulfilmentTests.payload(self))
        barrier = Barrier(2)

        def query(*args):
            self.assertFalse(connections['default'].in_atomic_block)
            barrier.wait(timeout=20)
            return 0

        def reconcile():
            close_old_connections()
            try:
                return reconcile_event(event.pk)
            finally:
                connections.close_all()

        with patch('payments.callbacks.DarajaGateway.query_payment', side_effect=query):
            with ThreadPoolExecutor(max_workers=2) as executor:
                results = list(executor.map(lambda _: reconcile(), range(2)))
        self.assertEqual(results, ['processed', 'processed'])
        self.assertEqual(DownloadGrant.objects.count(), 1)
        order.refresh_from_db()
        self.assertEqual(order.status, 'completed')
