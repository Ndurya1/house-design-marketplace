from decimal import Decimal
from tempfile import TemporaryDirectory
from pathlib import Path
from unittest.mock import patch

from django.contrib import admin
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase, override_settings, RequestFactory
from django.urls import reverse
from rest_framework.test import APIClient

from catalogue.models import Catalogue, Category
from users.models import User, Buyer
from orders.models import Orders, OrderItem, payments
from orders.services import create_guest_order


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class GuestOrderTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.seller_a = User.objects.create_user(username='seller-a', email='a@example.com', role='seller', name='Designer A')
        cls.seller_b = User.objects.create_user(username='seller-b', email='b@example.com', role='seller', name='Designer B')
        cls.buyer_user = User.objects.create_user(username='buyer', email='buyer@example.com', role='buyer')
        cls.other_buyer = User.objects.create_user(username='other', email='other@example.com', role='buyer')
        cls.admin_user = User.objects.create_user(username='admin', email='admin@example.com', role='admin')
        cls.buyer = Buyer.objects.create(user=cls.buyer_user, phone='0712345678')
        cls.category = Category.objects.create(name='Homes', group='residential')
        cls.plan_a = Catalogue.objects.create(title='Plan A', category=cls.category, price='1000.1234',
            seller=cls.seller_a.sellerprofile, status='published', plan_file='plan_files/a.pdf')
        cls.plan_b = Catalogue.objects.create(title='Plan B', category=cls.category, price='2000.0001',
            seller=cls.seller_b.sellerprofile, status='published', plan_file='plan_files/b.pdf')

    def setUp(self):
        private_dir = self.enterContext(TemporaryDirectory())
        self.enterContext(override_settings(PRIVATE_MEDIA_ROOT=private_dir))
        folder = Path(private_dir) / 'plan_files'
        folder.mkdir()
        for name in ['a.pdf', 'b.pdf']:
            (folder / name).write_bytes(b'%PDF-test snapshot')
        self.client = APIClient()
        self.url = reverse('orders-list')
        self.payload = {'guest_email': 'guest@example.com', 'guest_phone': '0712345678',
                        'plan_ids': [self.plan_a.pk, self.plan_b.pk]}

    def create_order(self, **kwargs):
        return create_guest_order(**{**self.payload, 'guest_phone': '+254712345678', **kwargs})

    def detail_url(self, order):
        return reverse('orders-detail', kwargs={'reference': order.reference})

    def test_guest_receipt_uses_server_values_and_cannot_be_retrieved(self):
        response = self.client.post(self.url, self.payload, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['total'], '3000.1235')
        self.assertEqual(response.data['status'], 'pending')
        self.assertEqual(response.data['currency'], 'KES')
        self.assertEqual(response.data['guest_phone'], '+254712345678')
        self.assertEqual(len(response.data['items']), 2)
        self.assertNotIn('plan_file', str(response.data))
        order = Orders.objects.get(reference=response.data['reference'])
        self.assertIsNone(order.buyer_id)
        self.assertEqual(self.client.get(self.url).status_code, 401)
        self.assertEqual(self.client.get(self.detail_url(order)).status_code, 401)

    def test_rejects_tampered_or_unknown_fields(self):
        for field, value in [('total', '1'), ('status', 'completed'), ('buyer', self.buyer.pk),
                             ('currency', 'USD'), ('items', []), ('is_legacy', True), ('amount', 1)]:
            with self.subTest(field=field):
                response = self.client.post(self.url, {**self.payload, field: value}, format='json')
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.data)
        self.assertEqual(Orders.objects.count(), 0)

    def test_validates_contact_and_plan_list(self):
        invalid = [{'guest_email': 'invalid'}, {'guest_phone': '+15551234567'}, {'guest_phone': ''},
                   {'plan_ids': []}, {'plan_ids': [self.plan_a.pk] * 2}, {'plan_ids': list(range(1, 22))},
                   {'plan_ids': [0]}, {'plan_ids': ['invalid']}]
        for change in invalid:
            with self.subTest(change=change):
                self.assertEqual(self.client.post(self.url, {**self.payload, **change}, format='json').status_code, 400)
        for phone, expected in [('0112345678', '+254112345678'), ('254712345678', '+254712345678'),
                                ('+254 712 345 678', '+254712345678')]:
            response = self.client.post(self.url, {**self.payload, 'guest_phone': phone}, format='json')
            self.assertEqual(response.status_code, 201)
            self.assertEqual(response.data['guest_phone'], expected)

    def test_unavailable_plans_create_nothing(self):
        for field, value in [('status', 'draft'), ('status', 'in_review'), ('plan_file', ''), ('seller', None)]:
            with self.subTest(field=field, value=value):
                Catalogue.objects.filter(pk=self.plan_a.pk).update(**{field: value})
                self.assertEqual(self.client.post(self.url, self.payload, format='json').status_code, 400)
                Catalogue.objects.filter(pk=self.plan_a.pk).update(status='published', plan_file='plan_files/a.pdf', seller=self.seller_a.sellerprofile)
        User.objects.filter(pk=self.seller_a.pk).update(is_active=False)
        self.assertEqual(self.client.post(self.url, self.payload, format='json').status_code, 400)
        self.assertEqual(self.client.post(self.url, {**self.payload, 'plan_ids': [2147483647]}, format='json').status_code, 400)
        self.assertEqual(Orders.objects.count(), 0)
        self.assertEqual(OrderItem.objects.count(), 0)

    def test_item_failure_rolls_back_order(self):
        with patch('orders.services.OrderItem.objects.bulk_create', side_effect=IntegrityError('test failure')):
            with self.assertRaises(IntegrityError):
                self.create_order()
        self.assertFalse(Orders.objects.exists())

    def test_buyer_association_uses_authentication_not_email(self):
        guest_order = self.create_order(guest_email=self.buyer_user.email)
        self.client.force_authenticate(self.buyer_user)
        self.assertEqual(self.client.get(self.detail_url(guest_order)).status_code, 404)
        response = self.client.post(self.url, self.payload, format='json')
        order = Orders.objects.get(reference=response.data['reference'])
        self.assertEqual(order.buyer_id, self.buyer.pk)
        self.assertEqual(self.client.get(self.detail_url(order)).status_code, 200)
        self.client.force_authenticate(self.other_buyer)
        self.assertEqual(self.client.get(self.detail_url(order)).status_code, 404)
        response = self.client.post(self.url, self.payload, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Orders.objects.get(reference=response.data['reference']).buyer.user_id, self.other_buyer.pk)

    def test_new_buyer_profile_rolls_back_for_invalid_order(self):
        self.client.force_authenticate(self.other_buyer)
        response = self.client.post(self.url, {**self.payload, 'plan_ids': [2147483647]}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Buyer.objects.filter(user=self.other_buyer).exists())

    def test_seller_sees_only_own_items_and_no_contact_or_full_total(self):
        order = self.create_order()
        other = self.create_order(plan_ids=[self.plan_b.pk])
        self.client.force_authenticate(self.seller_a)
        for response in [self.client.get(self.detail_url(order)), self.client.get(self.url)]:
            self.assertEqual(response.status_code, 200)
            data = response.data if isinstance(response.data, dict) else response.data[0]
            self.assertEqual(data['subtotal'], '1000.1234')
            self.assertEqual(len(data['items']), 1)
            self.assertEqual(data['items'][0]['title_snapshot'], 'Plan A')
            for field in ['total', 'guest_email', 'guest_phone', 'buyer']:
                self.assertNotIn(field, data)
        self.assertEqual(self.client.get(self.detail_url(other)).status_code, 404)
        payment_url = reverse('orders-get-payment-methods', kwargs={'reference': order.reference})
        self.assertEqual(self.client.get(payment_url).status_code, 403)
        self.client.force_authenticate(self.admin_user)
        data = self.client.get(self.detail_url(order)).data
        self.assertEqual(len(data['items']), 2)
        self.assertEqual(data['total'], '3000.1235')
        self.assertEqual(data['guest_email'], self.payload['guest_email'])

    def test_mutations_unavailable_for_admin_and_seller(self):
        order = self.create_order()
        for user in [self.admin_user, self.seller_a, self.buyer_user]:
            self.client.force_authenticate(user)
            for method in ['put', 'patch', 'delete']:
                self.assertEqual(getattr(self.client, method)(self.detail_url(order), {}, format='json').status_code, 405)
        for model in [Orders, OrderItem, payments]:
            model_admin = admin.site._registry[model]
            request = RequestFactory().get('/')
            request.user = self.admin_user
            self.assertFalse(model_admin.has_add_permission(request))
            self.assertFalse(model_admin.has_change_permission(request))
            self.assertFalse(model_admin.has_delete_permission(request))

    def test_catalogue_changes_and_deletion_preserve_snapshots(self):
        order = self.create_order(buyer=self.buyer)
        item = order.items.get(plan=self.plan_a)
        Catalogue.objects.filter(pk=self.plan_a.pk).update(title='New title', price='9999')
        self.plan_a.delete()
        self.seller_a.delete()
        self.buyer_user.delete()
        item.refresh_from_db(); order.refresh_from_db()
        self.assertEqual(item.title_snapshot, 'Plan A')
        self.assertEqual(item.unit_price, Decimal('1000.1234'))
        self.assertEqual(item.seller_name_snapshot, 'Designer A')
        self.assertIsNone(item.plan_id)
        self.assertIsNone(item.seller_id)
        self.assertIsNone(order.buyer_id)
        self.assertEqual(order.total, Decimal('3000.1235'))

    def test_ordinary_snapshot_edits_and_history_deletion_are_blocked(self):
        order = self.create_order()
        order.total = Decimal('1')
        with self.assertRaises(ValidationError):
            order.save()
        order.refresh_from_db()
        item = order.items.first()
        item.unit_price = Decimal('1')
        with self.assertRaises(ValidationError):
            item.save()
        with self.assertRaises(ValidationError):
            order.delete()
        with self.assertRaises(ValidationError):
            item.delete()
        with self.assertRaises(ProtectedError):
            Orders.objects.filter(pk=order.pk).delete()

    def test_database_constraints_reject_invalid_totals_and_duplicate_items(self):
        for total in [None, Decimal('-1'), Decimal('0')]:
            with transaction.atomic():
                with self.assertRaises(IntegrityError):
                    Orders.objects.create(total=total)
        order = self.create_order()
        item = order.items.first()
        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                OrderItem.objects.create(order=order, plan_id_snapshot=item.plan_id_snapshot,
                                         title_snapshot='Duplicate', unit_price=1)

    def test_legacy_unknown_subtotal_is_not_reported_as_zero(self):
        order = Orders.objects.create(is_legacy=True, total=None, status='completed')
        OrderItem.objects.create(order=order, seller=self.seller_a.sellerprofile,
            seller_id_snapshot=self.seller_a.sellerprofile.pk, plan_id_snapshot=self.plan_a.pk,
            title_snapshot='Legacy plan', unit_price=None)
        self.client.force_authenticate(self.seller_a)
        self.assertIsNone(self.client.get(self.detail_url(order)).data['subtotal'])

    def test_demo_payment_routes_do_not_call_daraja(self):
        with patch('django_daraja.mpesa.core.MpesaClient.stk_push') as stk_push:
            self.assertEqual(self.client.post('/api/payments/').status_code, 503)
            self.assertEqual(self.client.get('/api/payments/').status_code, 405)
            # The catalogue router owns the API root, not the historical demo view.
            self.assertEqual(self.client.get('/api/').status_code, 200)
            self.assertEqual(self.client.post('/api/').status_code, 405)
            stk_push.assert_not_called()
