from io import BytesIO, StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace

from django.core.exceptions import ValidationError
from django.core.management import call_command, CommandError
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework_simplejwt.tokens import AccessToken
from pypdf import PdfWriter
from PIL import Image

from catalogue.models import Catalogue, Category
from catalogue.validators import MAX_PLAN_FILE_BYTES, validate_plan_file
from users.models import User


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class CatalogueLifecycleTests(TestCase):
    def setUp(self):
        temporary = TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        media_settings = override_settings(
            MEDIA_ROOT=str(Path(temporary.name) / 'public'),
            PRIVATE_MEDIA_ROOT=str(Path(temporary.name) / 'private'),
        )
        media_settings.enable()
        self.addCleanup(media_settings.disable)
        self.category = Category.objects.create(
            name='Bungalows',
            group=Category.Group.RESIDENTIAL,
        )
        self.inactive_category = Category.objects.create(
            name='Retired category',
            group=Category.Group.RESIDENTIAL,
            is_active=False,
        )
        self.seller_a = User.objects.create_user(
            username='seller-a@example.com',
            email='seller-a@example.com',
            password='Password123!',
            role=User.UserChoices.SELLER,
            name='Seller A',
        )
        self.seller_b = User.objects.create_user(
            username='seller-b@example.com',
            email='seller-b@example.com',
            password='Password123!',
            role=User.UserChoices.SELLER,
            name='Seller B',
        )
        self.buyer = User.objects.create_user(
            username='buyer@example.com',
            email='buyer@example.com',
            password='Password123!',
            role=User.UserChoices.BUYER,
            name='Buyer',
        )
        self.admin = User.objects.create_user(
            username='admin@example.com',
            email='admin@example.com',
            password='Password123!',
            role=User.UserChoices.ADMIN,
            name='Admin',
        )
        self.draft = Catalogue.objects.create(
            title='Private bungalow',
            category=self.category,
            price='15000.00',
            seller=self.seller_a.sellerprofile,
        )
        self.published = Catalogue.objects.create(
            title='Public bungalow',
            category=self.category,
            price='16000.00',
            seller=self.seller_b.sellerprofile,
            status=Catalogue.ListingStatus.PUBLISHED,
        )

    def auth_header(self, user):
        token = AccessToken.for_user(user)
        return {'HTTP_AUTHORIZATION': f'Bearer {token}'}

    def thumbnail_file(self):
        stream = BytesIO()
        Image.new('RGB', (2, 2), 'white').save(stream, format='PNG')
        return SimpleUploadedFile(
            'thumbnail.png',
            stream.getvalue(),
            content_type='image/png',
        )

    def pdf_file(self, name='plan.pdf', content=None):
        if content is None:
            stream = BytesIO()
            writer = PdfWriter()
            writer.add_blank_page(width=200, height=200)
            writer.write(stream)
            content = stream.getvalue()
        return SimpleUploadedFile(name, content, content_type='application/pdf')

    def make_draft_ready_for_submission(self):
        self.draft.description = 'A detailed three-bedroom bungalow plan with clear room dimensions and building specifications.'
        self.draft.thumbnail = self.thumbnail_file()
        self.draft.plan_file = self.pdf_file()
        self.draft.save()

    def test_public_users_see_only_published_listings(self):
        list_response = self.client.get(reverse('catalogue-list'))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual([item['id'] for item in list_response.data['results']], [self.published.id])

        draft_response = self.client.get(
            reverse('catalogue-detail', kwargs={'pk': self.draft.pk})
        )
        self.assertEqual(draft_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_public_detail_hides_drafts_even_from_owner(self):
        own_response = self.client.get(
            reverse('catalogue-detail', kwargs={'pk': self.draft.pk}),
            **self.auth_header(self.seller_a),
        )
        self.assertEqual(own_response.status_code, status.HTTP_404_NOT_FOUND)

        other_draft = Catalogue.objects.create(
            title='Other private bungalow',
            category=self.category,
            price='17000.00',
            seller=self.seller_b.sellerprofile,
        )
        other_response = self.client.get(
            reverse('catalogue-detail', kwargs={'pk': other_draft.pk}),
            **self.auth_header(self.seller_a),
        )
        self.assertEqual(other_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_seller_can_submit_own_draft_for_review(self):
        self.make_draft_ready_for_submission()
        response = self.client.post(
            reverse('catalogue-submit', kwargs={'pk': self.draft.pk}),
            **self.auth_header(self.seller_a),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.draft.refresh_from_db()
        self.assertEqual(self.draft.status, Catalogue.ListingStatus.IN_REVIEW)

    def test_submission_rejects_an_incomplete_draft(self):
        response = self.client.post(
            reverse('catalogue-submit', kwargs={'pk': self.draft.pk}),
            **self.auth_header(self.seller_a),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('thumbnail', response.data)
        self.assertIn('plan_file', response.data)

    def test_seller_can_retrieve_only_own_listings(self):
        response = self.client.get(
            reverse('catalogue-mine'),
            **self.auth_header(self.seller_a),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item['id'] for item in response.data], [self.draft.id])

    def test_seller_cannot_edit_or_delete_a_published_listing(self):
        update_response = self.client.patch(
            reverse('catalogue-detail', kwargs={'pk': self.published.pk}),
            {'title': 'Changed title'},
            content_type='application/json',
            **self.auth_header(self.seller_b),
        )
        self.assertEqual(update_response.status_code, status.HTTP_403_FORBIDDEN)

        delete_response = self.client.delete(
            reverse('catalogue-detail', kwargs={'pk': self.published.pk}),
            **self.auth_header(self.seller_b),
        )
        self.assertEqual(delete_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_cannot_submit_another_sellers_draft(self):
        response = self.client.post(
            reverse('catalogue-submit', kwargs={'pk': self.draft.pk}),
            **self.auth_header(self.seller_b),
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_buyer_cannot_submit_a_listing(self):
        response = self.client.post(
            reverse('catalogue-submit', kwargs={'pk': self.draft.pk}),
            **self.auth_header(self.buyer),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_publish_and_return_a_listing_to_draft(self):
        self.make_draft_ready_for_submission()
        self.draft.status = Catalogue.ListingStatus.IN_REVIEW
        self.draft.save()

        publish_response = self.client.post(
            reverse('catalogue-publish', kwargs={'pk': self.draft.pk}),
            **self.auth_header(self.admin),
        )
        self.assertEqual(publish_response.status_code, status.HTTP_200_OK)
        self.draft.refresh_from_db()
        self.assertEqual(self.draft.status, Catalogue.ListingStatus.PUBLISHED)

        draft_response = self.client.post(
            reverse('catalogue-return-to-draft', kwargs={'pk': self.draft.pk}),
            **self.auth_header(self.admin),
        )
        self.assertEqual(draft_response.status_code, status.HTTP_200_OK)
        self.draft.refresh_from_db()
        self.assertEqual(self.draft.status, Catalogue.ListingStatus.DRAFT)

    def test_clients_cannot_create_a_published_listing_directly(self):
        response = self.client.post(
            reverse('catalogue-list'),
            {
                'title': 'Attempted published listing',
                'category': self.category.pk,
                'price': '25000.00',
                'status': Catalogue.ListingStatus.PUBLISHED,
            },
            content_type='application/json',
            **self.auth_header(self.seller_a),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], Catalogue.ListingStatus.DRAFT)

    def test_create_rejects_an_inactive_category(self):
        response = self.client.post(
            reverse('catalogue-list'),
            {
                'title': 'Inactive category plan',
                'category': self.inactive_category.pk,
                'price': '25000.00',
            },
            content_type='application/json',
            **self.auth_header(self.seller_a),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('category', response.data)

    def test_create_accepts_a_pdf_plan_and_thumbnail(self):
        response = self.client.post(
            reverse('catalogue-list'),
            {
                'title': 'Complete draft',
                'category': self.category.pk,
                'price': '25000.00',
                'thumbnail': self.thumbnail_file(),
                'plan_file': self.pdf_file(),
            },
            **self.auth_header(self.seller_a),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['thumbnail'])
        self.assertTrue(response.data['has_plan_file'])
        self.assertNotIn('plan_file', response.data)

    def test_create_rejects_a_non_pdf_plan_file(self):
        response = self.client.post(
            reverse('catalogue-list'),
            {
                'title': 'Invalid plan',
                'category': self.category.pk,
                'price': '25000.00',
                'plan_file': self.pdf_file('plan.pdf', b'not a PDF'),
            },
            **self.auth_header(self.seller_a),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('plan_file', response.data)

    def test_plan_file_validator_rejects_oversized_files(self):
        oversized_upload = SimpleNamespace(
            name='plan.pdf',
            size=MAX_PLAN_FILE_BYTES + 1,
        )
        with self.assertRaisesMessage(ValidationError, 'Plan files must be 20 MB or smaller.'):
            validate_plan_file(oversized_upload)

    def test_public_category_list_hides_inactive_categories(self):
        response = self.client.get(reverse('category-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item['id'] for item in response.data], [self.category.id])

    def test_only_admin_can_manage_categories(self):
        payload = {
            'name': 'Villas',
            'group': Category.Group.RESIDENTIAL,
        }
        seller_response = self.client.post(
            reverse('category-list'),
            payload,
            content_type='application/json',
            **self.auth_header(self.seller_a),
        )
        self.assertEqual(seller_response.status_code, status.HTTP_403_FORBIDDEN)

        admin_response = self.client.post(
            reverse('category-list'),
            payload,
            content_type='application/json',
            **self.auth_header(self.admin),
        )
        self.assertEqual(admin_response.status_code, status.HTTP_201_CREATED)

    def test_used_category_cannot_be_deleted(self):
        response = self.client.delete(
            reverse('category-detail', kwargs={'pk': self.category.pk}),
            **self.auth_header(self.admin),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_private_download_permissions_and_contents(self):
        self.make_draft_ready_for_submission()
        self.draft.status = Catalogue.ListingStatus.PUBLISHED
        self.draft.save()
        url = reverse('catalogue-download-plan-file', kwargs={'pk': self.draft.pk})
        self.assertEqual(self.client.get(url).status_code, 401)
        for user in [self.seller_b, self.buyer]:
            self.assertEqual(self.client.get(url, **self.auth_header(user)).status_code, 403)
        expected = self.pdf_file().read()
        for user in [self.seller_a, self.admin]:
            response = self.client.get(url, **self.auth_header(user))
            self.assertEqual(response.status_code, 200)
            self.assertEqual(b''.join(response.streaming_content), expected)
            self.assertEqual(response['Cache-Control'], 'private, no-store')
        response = self.client.get(reverse('catalogue-detail', kwargs={'pk': self.draft.pk}))
        self.assertNotIn('plan_file', response.data)
        self.assertFalse((Path(settings.MEDIA_ROOT) / self.draft.plan_file.name).exists())
        with self.assertRaises(ValueError):
            _ = self.draft.plan_file.url

    def test_missing_file_download_returns_404(self):
        self.draft.plan_file = 'plan_files/missing.pdf'
        self.draft.save()
        response = self.client.get(
            reverse('catalogue-download-plan-file', kwargs={'pk': self.draft.pk}),
            **self.auth_header(self.seller_a),
        )
        self.assertEqual(response.status_code, 404)

    def test_draft_update_and_review_lock(self):
        url = reverse('catalogue-detail', kwargs={'pk': self.draft.pk})
        response = self.client.patch(url, {'title': 'Updated draft'},
                                    content_type='application/json', **self.auth_header(self.seller_a))
        self.assertEqual(response.status_code, 200)
        self.draft.refresh_from_db()
        self.assertEqual(self.draft.title, 'Updated draft')
        self.draft.status = Catalogue.ListingStatus.IN_REVIEW
        self.draft.save()
        self.assertEqual(self.client.patch(url, {'title': 'Bypass review'},
                         content_type='application/json', **self.auth_header(self.seller_a)).status_code, 403)
        self.assertEqual(self.client.delete(url, **self.auth_header(self.seller_a)).status_code, 403)

    def test_inactive_category_blocks_submit_and_publish(self):
        self.make_draft_ready_for_submission()
        self.category.is_active = False
        self.category.save()
        for action, user, state in [('submit', self.seller_a, Catalogue.ListingStatus.DRAFT),
                                     ('publish', self.admin, Catalogue.ListingStatus.IN_REVIEW)]:
            self.draft.status = state
            self.draft.save()
            response = self.client.post(reverse(f'catalogue-{action}', kwargs={'pk': self.draft.pk}),
                                        **self.auth_header(user))
            self.assertEqual(response.status_code, 400)
            self.assertIn('category', response.data)
            self.draft.refresh_from_db()
            self.assertEqual(self.draft.status, state)

    def test_incomplete_listing_cannot_be_published(self):
        self.draft.status = Catalogue.ListingStatus.IN_REVIEW
        self.draft.save()
        response = self.client.post(reverse('catalogue-publish', kwargs={'pk': self.draft.pk}),
                                    **self.auth_header(self.admin))
        self.assertEqual(response.status_code, 400)

    def test_upload_and_price_validation(self):
        for field, value in [('price', '0'), ('price', '-1'),
                             ('thumbnail', SimpleUploadedFile('fake.png', b'not an image')),
                             ('plan_file', self.pdf_file(content=b'%PDF-1.7\ninvalid')),
                             ('plan_file', self.pdf_file(name='plan.txt'))]:
            with self.subTest(field=field, value=str(value)):
                payload = {'title': 'Draft', 'category': self.category.pk, 'price': '0.01', field: value}
                response = self.client.post(reverse('catalogue-list'), payload, **self.auth_header(self.seller_a))
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.data)
        response = self.client.post(reverse('catalogue-list'),
            {'title': 'Minimum price', 'category': self.category.pk, 'price': '0.01'},
            **self.auth_header(self.seller_a))
        self.assertEqual(response.status_code, 201)

    def test_pdf_rejects_encryption_and_empty_pages_and_restores_position(self):
        for encrypted in [False, True]:
            writer = PdfWriter()
            if encrypted:
                writer.add_blank_page(width=200, height=200)
                writer.encrypt('secret')
            stream = BytesIO()
            writer.write(stream)
            upload = self.pdf_file(content=stream.getvalue())
            upload.seek(3)
            with self.assertRaises(ValidationError):
                validate_plan_file(upload)
            self.assertEqual(upload.tell(), 3)

    def test_thumbnail_size_limit(self):
        from catalogue.validators import MAX_THUMBNAIL_BYTES, validate_thumbnail_file
        with self.assertRaises(ValidationError):
            validate_thumbnail_file(SimpleNamespace(size=MAX_THUMBNAIL_BYTES + 1))

    def test_relocation_is_verified_and_repeatable(self):
        name = 'plan_files/legacy.pdf'
        self.draft.plan_file = name
        self.draft.save()
        source = Path(settings.MEDIA_ROOT) / name
        source.parent.mkdir(parents=True)
        source.write_bytes(self.pdf_file().read())
        expected = source.read_bytes()
        call_command('privatize_plan_files', stdout=StringIO())
        self.assertFalse(source.exists())
        self.assertEqual((Path(settings.PRIVATE_MEDIA_ROOT) / name).read_bytes(), expected)
        call_command('privatize_plan_files', stdout=StringIO())
        source.write_bytes(b'conflict')
        with self.assertRaises(CommandError):
            call_command('privatize_plan_files', stdout=StringIO())
        self.assertEqual(source.read_bytes(), b'conflict')

    def test_relocation_reports_missing_files(self):
        self.draft.plan_file = 'plan_files/missing.pdf'
        self.draft.save()
        with self.assertRaisesMessage(CommandError, 'Missing file'):
            call_command('privatize_plan_files', stdout=StringIO())

    def test_retired_public_pdf_route_is_blocked(self):
        import importlib
        import plan.urls
        from django.urls import clear_url_caches, resolve
        try:
            with override_settings(DEBUG=True):
                importlib.reload(plan.urls)
                clear_url_caches()
                match = resolve('/media/plan_files/legacy.pdf')
                self.assertEqual(match.func(None, **match.kwargs).status_code, 404)
        finally:
            importlib.reload(plan.urls)
            clear_url_caches()
