from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class GuestOrderMigrationTests(TransactionTestCase):
    def test_legacy_history_is_preserved_without_inventing_prices(self):
        executor = MigrationExecutor(connection)
        latest = executor.loader.graph.leaf_nodes()
        old_targets = [node for node in latest if node[0] not in ['orders', 'payments']] + [('orders', '0001_initial'), ('payments', None)]

        def restore_schema():
            MigrationExecutor(connection).migrate(latest)

        self.addCleanup(restore_schema)
        executor.migrate(old_targets)
        old_apps = executor.loader.project_state([node for node in old_targets if node[1] is not None]).apps
        User = old_apps.get_model('users', 'User')
        Seller = old_apps.get_model('users', 'SellerProfile')
        Buyer = old_apps.get_model('users', 'Buyer')
        Category = old_apps.get_model('catalogue', 'Category')
        Plan = old_apps.get_model('catalogue', 'Catalogue')
        Order = old_apps.get_model('orders', 'Orders')
        Payment = old_apps.get_model('orders', 'payments')

        designer = User.objects.create(username='legacy-seller', email='legacy-seller@example.com', name='Legacy Designer', role='seller')
        seller = Seller.objects.create(user=designer, phone='0712345678')
        user = User.objects.create(username='legacy-buyer', email='legacy-buyer@example.com', role='buyer')
        buyer = Buyer.objects.create(user=user, phone='0712345678')
        category = Category.objects.create(name='Legacy homes', group='residential')
        plan = Plan.objects.create(title='Historical plan', price='9999', category=category, seller=seller)
        first = Order.objects.create(product=plan, amount=plan, buyer=buyer, status='completed')
        second = Order.objects.create(product=plan, amount=plan, status='pending')
        payment = Payment.objects.create(orders=first, payment_method='MPESA')

        executor = MigrationExecutor(connection)
        executor.migrate(latest)
        apps = executor.loader.project_state(latest).apps
        Order = apps.get_model('orders', 'Orders')
        Item = apps.get_model('orders', 'OrderItem')
        migrated = Order.objects.get(pk=first.pk)
        guest = Order.objects.get(pk=second.pk)
        self.assertNotEqual(migrated.reference, guest.reference)
        self.assertTrue(migrated.is_legacy)
        self.assertTrue(guest.is_legacy)
        self.assertIsNone(migrated.total)
        self.assertIsNone(guest.total)
        self.assertEqual(migrated.status, 'completed')
        self.assertEqual(migrated.created_at, first.created_at)
        self.assertEqual(migrated.updated_at, first.updated_at)
        self.assertEqual(migrated.guest_email, user.email)
        self.assertEqual(migrated.guest_phone, buyer.phone)
        self.assertEqual(guest.guest_email, '')
        self.assertEqual(guest.guest_phone, '')
        self.assertEqual(Item.objects.count(), 2)
        item = Item.objects.get(order_id=first.pk)
        self.assertIsNone(item.unit_price)
        self.assertEqual(item.title_snapshot, plan.title)
        self.assertEqual(item.plan_id_snapshot, plan.pk)
        self.assertEqual(item.seller_name_snapshot, designer.name)
        self.assertEqual(apps.get_model('orders', 'payments').objects.get(pk=payment.pk).orders_id, first.pk)
