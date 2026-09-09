from django.contrib.admin.models import LogEntry
from django.contrib.auth.models import Permission
from django.core.exceptions import PermissionDenied
from django.test import TestCase
from django.urls import reverse
from rest_framework.exceptions import ValidationError
from catalogue import tests as catalogue_tests
from catalogue.models import Catalogue
from catalogue.services import review_listing
from orders.models import Orders
from orders.services import create_guest_order
from users.operations import set_designer_active


class AdminOperationsTests(TestCase):
    setUp = catalogue_tests.CatalogueLifecycleTests.setUp
    auth_header = catalogue_tests.CatalogueLifecycleTests.auth_header
    thumbnail_file = catalogue_tests.CatalogueLifecycleTests.thumbnail_file
    pdf_file = catalogue_tests.CatalogueLifecycleTests.pdf_file
    make_draft_ready_for_submission = catalogue_tests.CatalogueLifecycleTests.make_draft_ready_for_submission

    def ready(self):
        self.make_draft_ready_for_submission()
        self.draft.status = Catalogue.ListingStatus.IN_REVIEW
        self.draft.save()

    def operator_login(self):
        self.admin.is_staff = True
        self.admin.save()
        self.admin.user_permissions.add(*Permission.objects.filter(
            content_type__app_label='catalogue', codename__in=['view_catalogue', 'change_catalogue']))
        self.client.force_login(self.admin)

    def test_admin_action_publishes_and_records_operator(self):
        self.ready()
        self.operator_login()
        response = self.client.post(reverse('admin:catalogue_catalogue_changelist'),
            {'action': 'publish_selected', '_selected_action': [self.draft.pk]})
        self.assertEqual(response.status_code, 302)
        self.draft.refresh_from_db()
        self.assertEqual(self.draft.status, 'published')
        self.assertTrue(LogEntry.objects.filter(user=self.admin, object_id=str(self.draft.pk),
                                               change_message='Listing published.').exists())

    def test_incomplete_review_cannot_publish(self):
        self.draft.status = 'in_review'
        self.draft.save()
        with self.assertRaises(ValidationError):
            review_listing(actor=self.admin, listing_id=self.draft.pk, publish=True)
        self.draft.refresh_from_db()
        self.assertEqual(self.draft.status, 'in_review')

    def test_repeat_publication_is_rejected(self):
        self.ready()
        review_listing(actor=self.admin, listing_id=self.draft.pk, publish=True)
        with self.assertRaises(ValidationError):
            review_listing(actor=self.admin, listing_id=self.draft.pk, publish=True)

    def test_designer_cannot_use_operator_service(self):
        self.ready()
        with self.assertRaises(PermissionDenied):
            review_listing(actor=self.seller_a, listing_id=self.draft.pk, publish=True)
        with self.assertRaises(PermissionDenied):
            set_designer_active(actor=self.seller_a, designer_id=self.seller_b.pk, active=False)

    def test_suspension_hides_public_plan_and_reactivation_restores_it(self):
        set_designer_active(actor=self.admin, designer_id=self.seller_b.pk, active=False)
        detail = reverse('catalogue-detail', args=[self.published.pk])
        self.assertEqual(self.client.get(detail).status_code, 404)
        self.assertEqual(self.client.get(reverse('catalogue-list')).data['count'], 0)
        set_designer_active(actor=self.admin, designer_id=self.seller_b.pk, active=True)
        self.assertEqual(self.client.get(detail).status_code, 200)

    def test_suspended_designer_token_cannot_access_private_plans(self):
        headers = self.auth_header(self.seller_a)
        set_designer_active(actor=self.admin, designer_id=self.seller_a.pk, active=False)
        self.assertEqual(self.client.get(reverse('catalogue-mine'), **headers).status_code, 401)

    def test_inactive_category_hides_plan_and_blocks_new_order(self):
        self.ready()
        review_listing(actor=self.admin, listing_id=self.draft.pk, publish=True)
        self.category.is_active = False
        self.category.save()
        self.assertEqual(self.client.get(reverse('catalogue-detail', args=[self.draft.pk])).status_code, 404)
        with self.assertRaises(ValidationError):
            create_guest_order(guest_email='guest@example.com', guest_phone='+254712345678', plan_ids=[self.draft.pk])

    def test_suspension_preserves_existing_order_snapshot(self):
        self.ready()
        review_listing(actor=self.admin, listing_id=self.draft.pk, publish=True)
        order = create_guest_order(guest_email='guest@example.com', guest_phone='+254712345678', plan_ids=[self.draft.pk])
        snapshot = order.items.get().file_snapshot
        set_designer_active(actor=self.admin, designer_id=self.seller_a.pk, active=False)
        self.assertTrue(Orders.objects.filter(pk=order.pk).exists())
        self.assertEqual(order.items.get().file_snapshot.sha256, snapshot.sha256)
        with self.assertRaises(ValidationError):
            create_guest_order(guest_email='guest@example.com', guest_phone='+254712345678', plan_ids=[self.draft.pk])

    def test_pdf_review_requires_model_permission(self):
        self.ready()
        url = reverse('admin:catalogue_catalogue_review_pdf', args=[self.draft.pk])
        self.assertEqual(self.client.get(url).status_code, 302)
        self.admin.is_staff = True
        self.admin.save()
        self.client.force_login(self.admin)
        self.assertEqual(self.client.get(url).status_code, 403)
        self.operator_login()
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn('no-store', response['Cache-Control'])
        self.assertTrue(b''.join(response.streaming_content).startswith(b'%PDF'))

    def test_staff_accounts_cannot_be_suspended_by_bulk_action(self):
        self.seller_a.is_staff = True
        self.seller_a.save()
        with self.assertRaises(ValidationError):
            set_designer_active(actor=self.admin, designer_id=self.seller_a.pk, active=False)
