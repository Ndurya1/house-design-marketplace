from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from threading import Event
from unittest.mock import Mock, patch
from uuid import uuid4

import requests
from django.contrib.auth.models import AnonymousUser
from django.core import signing
from django.db import IntegrityError, close_old_connections, connections, transaction
from django.test import SimpleTestCase, TestCase, TransactionTestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from orders.checkout_tokens import CHECKOUT_TOKEN_SALT, issue_checkout_token, validate_checkout_token
from orders.models import Orders, OrderItem, OrderFileSnapshot
from tempfile import TemporaryDirectory
from pathlib import Path
from users.models import User, Buyer
from .gateway import DarajaGateway, InitiationOutcome, PaymentUnavailable
from .models import PaymentAttempt
from .services import PaymentConflict, initiate_payment, record_initiation_outcome


PAYMENT_SETTINGS = dict(
    PAYMENT_INITIATION_ENABLED=True, MPESA_ENVIRONMENT='sandbox',
    MPESA_CONSUMER_KEY='test-key', MPESA_CONSUMER_SECRET='test-secret', MPESA_PASSKEY='test-passkey',
    MPESA_SHORTCODE='174379', MPESA_EXPRESS_SHORTCODE='174379',
    MPESA_CALLBACK_URL='https://example.com/callback', MPESA_CONNECT_TIMEOUT=2, MPESA_READ_TIMEOUT=5,
)


def attach_snapshot(order):
    item = OrderItem.objects.create(order=order, plan_id_snapshot=1, title_snapshot='Plan', unit_price=order.total)
    OrderFileSnapshot.objects.create(order_item=item, file='order_files/test.pdf', sha256='a' * 64)


@override_settings(**PAYMENT_SETTINGS)
class PaymentInitiationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.order = Orders.objects.create(total=Decimal('1000'), guest_phone='+254712345678', guest_email='guest@example.com')
        attach_snapshot(self.order)
        private_dir = self.enterContext(TemporaryDirectory())
        self.enterContext(override_settings(PRIVATE_MEDIA_ROOT=private_dir))
        folder = Path(private_dir) / 'plan_files'
        folder.mkdir()
        (folder / 'plan.pdf').write_bytes(b'%PDF-test')
        self.token = issue_checkout_token(self.order)
        self.payload = {'order_reference': str(self.order.reference), 'idempotency_key': str(uuid4())}
        self.url = reverse('payments')
        self.gateway = self.enterContext(patch('payments.services.DarajaGateway.initiate'))
        self.gateway.side_effect = lambda attempt: InitiationOutcome('pending', merchant_request_id='merchant-' + attempt.reference.hex,
                                                                    checkout_request_id='checkout-' + attempt.reference.hex)

    def post(self, payload=None, token=None):
        return self.client.post(self.url, payload or self.payload, format='json',
                                HTTP_X_CHECKOUT_TOKEN=self.token if token is None else token)

    def test_pending_attempt_uses_snapshots_and_never_completes_order(self):
        response = self.post()
        self.assertEqual(response.status_code, 202, response.data)
        self.assertEqual(response.data['status'], 'pending')
        self.assertEqual(response.data['amount'], '1000.0000')
        self.assertEqual(response['Cache-Control'], 'no-store')
        attempt = PaymentAttempt.objects.get()
        self.assertEqual(attempt.phone, self.order.guest_phone)
        self.assertTrue(attempt.checkout_request_id)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'pending')
        self.assertNotIn('phone', response.data)
        self.assertNotIn('checkout_request_id', response.data)

    def test_token_is_required_and_bound_to_order_purpose_and_expiry(self):
        other = Orders.objects.create(total=1, guest_phone='+254712345678')
        wrong_purpose = signing.dumps({'order': str(self.order.reference), 'purpose': 'download'}, salt=CHECKOUT_TOKEN_SALT)
        for token in ['', self.token + 'x', issue_checkout_token(other), wrong_purpose]:
            with self.subTest(token_type=token[:8]):
                self.assertEqual(self.post(token=token).status_code, 403)
        with patch('django.core.signing.time.time', return_value=1000):
            expired = issue_checkout_token(self.order)
        self.assertEqual(self.post(token=expired).status_code, 403)
        self.assertFalse(PaymentAttempt.objects.exists())
        self.gateway.assert_not_called()

    def test_only_owning_buyer_account_can_pay_without_token(self):
        buyer_user = User.objects.create_user(username='buyer', email='buyer@example.com', role='buyer')
        buyer = Buyer.objects.create(user=buyer_user, phone='0712345678')
        Orders.objects.filter(pk=self.order.pk).update(buyer=buyer)
        for role in ['admin', 'seller', 'buyer']:
            user = User.objects.create_user(username=role + '-other', email=role + '-other@example.com', role=role)
            self.client.force_authenticate(user)
            self.assertEqual(self.post(token='').status_code, 403)
        self.client.force_authenticate(buyer_user)
        self.assertEqual(self.post(token='').status_code, 202)

    def test_replay_returns_existing_attempt_and_other_key_cannot_bypass(self):
        first = self.post()
        second = self.post()
        self.assertEqual(first.data['reference'], second.data['reference'])
        self.assertEqual(self.gateway.call_count, 1)
        self.assertEqual(self.post({**self.payload, 'idempotency_key': str(uuid4())}).status_code, 409)
        self.assertEqual(self.post(token='invalid').status_code, 403)
        self.assertEqual(PaymentAttempt.objects.count(), 1)

    def test_rejection_allows_new_key_but_not_replay_dispatch(self):
        self.gateway.side_effect = None
        self.gateway.return_value = InitiationOutcome('rejected', 'provider_rejected')
        self.assertEqual(self.post().status_code, 200)
        self.post()
        self.assertEqual(self.gateway.call_count, 1)
        self.post({**self.payload, 'idempotency_key': str(uuid4())})
        self.assertEqual(self.gateway.call_count, 2)

    def test_uncertain_and_unexpected_gateway_failures_block_new_requests(self):
        self.gateway.side_effect = RuntimeError('sensitive provider details')
        response = self.post()
        self.assertEqual(response.data['status'], 'unknown')
        self.assertEqual(response.data['error_code'], 'gateway_failure')
        self.assertNotIn('sensitive', str(response.data))
        self.assertEqual(self.post({**self.payload, 'idempotency_key': str(uuid4())}).status_code, 409)
        self.assertEqual(self.gateway.call_count, 1)

    def test_stalled_initiation_blocks_another_attempt(self):
        PaymentAttempt.objects.create(order=self.order, amount=1000, phone=self.order.guest_phone, idempotency_key=uuid4())
        self.assertEqual(self.post().status_code, 409)
        self.gateway.assert_not_called()

    def test_invalid_order_states_and_fractional_total(self):
        for changes in [{'is_legacy': True}, {'status': 'completed'}, {'status': 'cancelled'}, {'total': Decimal('1.25')},
                        {'guest_phone': ''}, {'is_legacy': True, 'total': None}]:
            with self.subTest(changes=changes):
                Orders.objects.filter(pk=self.order.pk).update(**changes)
                self.assertEqual(self.post().status_code, 400)
                Orders.objects.filter(pk=self.order.pk).update(is_legacy=False, status='pending', total=1000, guest_phone='+254712345678')
        self.gateway.assert_not_called()

    def test_client_cannot_supply_payment_details(self):
        for field in ['amount', 'phone', 'callback_url', 'status']:
            self.assertEqual(self.post({**self.payload, field: 'untrusted'}).status_code, 400)
        self.assertEqual(self.post({**self.payload, 'idempotency_key': 'invalid'}).status_code, 400)
        self.assertFalse(PaymentAttempt.objects.exists())

    def test_disabled_and_misconfigured_initiation_creates_no_attempt(self):
        with override_settings(PAYMENT_INITIATION_ENABLED=False):
            self.assertEqual(self.post().status_code, 503)
        with override_settings(MPESA_CALLBACK_URL=''):
            self.assertEqual(self.post().status_code, 503)
        self.assertFalse(PaymentAttempt.objects.exists())
        self.gateway.assert_not_called()

    def test_slow_initiation_response_does_not_overwrite_advanced_state(self):
        def callback_first(attempt):
            PaymentAttempt.objects.filter(pk=attempt.pk).update(status='unknown', error_code='reconciliation_started')
            return InitiationOutcome('pending', checkout_request_id='late', merchant_request_id='late')
        self.gateway.side_effect = callback_first
        response = self.post()
        self.assertEqual(response.data['status'], 'unknown')
        self.assertEqual(response.data['error_code'], 'reconciliation_started')
        self.assertIsNone(PaymentAttempt.objects.get().checkout_request_id)

    def test_provider_id_collision_is_unresolved_not_retried(self):
        other = Orders.objects.create(total=1)
        PaymentAttempt.objects.create(order=other, amount=1, phone='+254712345678', idempotency_key=uuid4(),
                                      status='pending', checkout_request_id='duplicate')
        self.gateway.side_effect = None
        self.gateway.return_value = InitiationOutcome('pending', checkout_request_id='duplicate', merchant_request_id='merchant')
        self.assertEqual(self.post().data['status'], 'unknown')
        self.assertEqual(PaymentAttempt.objects.get(order=self.order).error_code, 'provider_id_conflict')

    def test_database_constraints_protect_active_attempts_and_keys(self):
        attempt = PaymentAttempt.objects.create(order=self.order, amount=1, phone=self.order.guest_phone, idempotency_key=uuid4())
        for key, state in [(uuid4(), 'pending'), (attempt.idempotency_key, 'rejected')]:
            with self.assertRaises(IntegrityError), transaction.atomic():
                PaymentAttempt.objects.create(order=self.order, amount=1, phone=self.order.guest_phone, idempotency_key=key, status=state)

    def test_cors_allows_checkout_header(self):
        with override_settings(CORS_ALLOWED_ORIGINS=['http://localhost:5173']):
            response = self.client.options(self.url, HTTP_ORIGIN='http://localhost:5173',
                HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST', HTTP_ACCESS_CONTROL_REQUEST_HEADERS='x-checkout-token,content-type')
        self.assertIn('x-checkout-token', response['Access-Control-Allow-Headers'])

    def test_order_creation_issues_token_but_reads_do_not(self):
        from catalogue.models import Category, Catalogue
        user = User.objects.create_user(username='designer', email='designer@example.com', role='seller')
        category = Category.objects.create(name='Homes', group='residential')
        plan = Catalogue.objects.create(title='Plan', category=category, seller=user.sellerprofile,
                                        price=1000, status='published', plan_file='plan_files/plan.pdf')
        response = self.client.post(reverse('orders-list'), {'guest_email': 'guest@example.com',
            'guest_phone': '0712345678', 'plan_ids': [plan.pk]}, format='json')
        self.assertEqual(response.status_code, 201)
        order = Orders.objects.get(reference=response.data['reference'])
        self.assertTrue(validate_checkout_token(response.data['checkout_token'], order))
        self.assertEqual(response['Cache-Control'], 'no-store')
        self.client.force_authenticate(user)
        for record in self.client.get(reverse('orders-list')).data:
            self.assertNotIn('checkout_token', record)


@override_settings(**PAYMENT_SETTINGS)
class GatewayTests(SimpleTestCase):
    def setUp(self):
        self.get = self.enterContext(patch('payments.gateway.requests.get'))
        self.post = self.enterContext(patch('payments.gateway.requests.post'))
        self.get.return_value = Mock(status_code=200, json=Mock(return_value={'access_token': 'fake-token'}))
        self.post.return_value = Mock(status_code=200, json=Mock(return_value={
            'ResponseCode': '0', 'MerchantRequestID': 'merchant', 'CheckoutRequestID': 'checkout'}))
        self.attempt = Mock(reference=uuid4(), amount=Decimal('1000'), phone='+254712345678')

    def test_payload_uses_fixed_host_snapshot_values_and_timeouts(self):
        gateway = DarajaGateway()
        gateway.validate_configuration()
        outcome = gateway.initiate(self.attempt)
        self.assertEqual(outcome.status, 'pending')
        self.assertEqual(self.get.call_args.args[0], 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials')
        self.assertEqual(self.post.call_args.args[0], 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest')
        payload = self.post.call_args.kwargs['json']
        self.assertEqual(payload['Amount'], 1000)
        self.assertIsInstance(payload['Amount'], int)
        self.assertEqual(payload['PhoneNumber'], '254712345678')
        self.assertEqual(len(payload['AccountReference']), 12)
        self.assertEqual(payload['CallBackURL'], PAYMENT_SETTINGS['MPESA_CALLBACK_URL'])
        for call in [self.get.call_args, self.post.call_args]:
            self.assertEqual(call.kwargs['timeout'], (2, 5))
            self.assertFalse(call.kwargs['allow_redirects'])

    def test_oauth_failure_never_dispatches_stk(self):
        for failure in [requests.Timeout(), ValueError('bad json')]:
            self.get.side_effect = failure
            self.assertEqual(DarajaGateway().initiate(self.attempt).status, 'rejected')
        self.post.assert_not_called()

    def test_dispatch_timeout_or_malformed_json_is_unknown_without_retry(self):
        self.post.side_effect = requests.Timeout()
        self.assertEqual(DarajaGateway().initiate(self.attempt).status, 'unknown')
        self.assertEqual(self.post.call_count, 1)
        self.post.side_effect = None
        self.post.return_value.json.side_effect = ValueError('bad json')
        self.assertEqual(DarajaGateway().initiate(self.attempt).status, 'unknown')

    def test_provider_rejection_and_ambiguous_responses(self):
        for http_status, data, expected in [
            (400, {'errorCode': '400.002.02'}, 'rejected'),
            (200, {'ResponseCode': '1'}, 'rejected'),
            (200, {'ResponseCode': '0'}, 'unknown'),
            (200, {'ResponseCode': '0', 'errorCode': 'conflicting'}, 'unknown'),
            (502, {'errorCode': 'server_failed'}, 'unknown'),
            (302, {}, 'unknown'), (200, [], 'unknown'), (200, {}, 'unknown'),
        ]:
            with self.subTest(data=data):
                self.assertEqual(DarajaGateway.parse_response(http_status, data).status, expected)

    def test_configuration_rejects_missing_secrets_bad_host_callback_and_timeout(self):
        for overrides in [{'MPESA_CONSUMER_KEY': ''}, {'MPESA_ENVIRONMENT': 'custom'},
                          {'MPESA_CALLBACK_URL': 'http://example.com/callback'},
                          {'MPESA_CALLBACK_URL': 'https://user:pass@example.com/callback'},
                          {'MPESA_CONNECT_TIMEOUT': 0}, {'MPESA_READ_TIMEOUT': float('nan')}]:
            with self.subTest(overrides=overrides), override_settings(**overrides):
                with self.assertRaises(PaymentUnavailable):
                    DarajaGateway().validate_configuration()
        self.get.assert_not_called()
        self.post.assert_not_called()


@override_settings(**PAYMENT_SETTINGS)
class PaymentConcurrencyTests(TransactionTestCase):
    def test_committed_reservation_blocks_concurrent_dispatch(self):
        order = Orders.objects.create(total=1000, guest_phone='+254712345678')
        attach_snapshot(order)
        token = issue_checkout_token(order)
        key = uuid4()
        dispatched, finish = Event(), Event()

        def slow_gateway(attempt):
            self.assertFalse(connections['default'].in_atomic_block)
            dispatched.set()
            if not finish.wait(20):
                raise RuntimeError('Test did not release gateway')
            return InitiationOutcome('pending', merchant_request_id='merchant', checkout_request_id='checkout')

        def run_first():
            close_old_connections()
            try:
                return initiate_payment(user=AnonymousUser(), checkout_token=token,
                                        order_reference=order.reference, idempotency_key=key)
            finally:
                connections.close_all()

        with patch('payments.services.DarajaGateway.initiate', side_effect=slow_gateway) as gateway:
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(run_first)
                try:
                    self.assertTrue(dispatched.wait(15))
                    replay = initiate_payment(user=AnonymousUser(), checkout_token=token,
                                              order_reference=order.reference, idempotency_key=key)
                    self.assertEqual(replay.status, 'initiating')
                    with self.assertRaises(PaymentConflict):
                        initiate_payment(user=AnonymousUser(), checkout_token=token,
                                         order_reference=order.reference, idempotency_key=uuid4())
                finally:
                    finish.set()
                self.assertEqual(future.result(timeout=10).status, 'pending')
            self.assertEqual(gateway.call_count, 1)
            self.assertEqual(PaymentAttempt.objects.count(), 1)
