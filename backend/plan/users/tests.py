import re

from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.reverse import reverse
from rest_framework_simplejwt.tokens import AccessToken

from users.models import User
from users.serializers import DesignerRegistrationSerializer


class DesignerRegistrationSerializerTests(TestCase):
    def test_creates_a_seller_with_a_matching_internal_username(self):
        serializer = DesignerRegistrationSerializer(
            data={
                'name': 'Amina Designer',
                'email': 'AMINA@EXAMPLE.COM',
                'password': 'Amina-Designs-2026!',
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertEqual(user.email, 'amina@example.com')
        self.assertEqual(user.username, 'amina@example.com')
        self.assertEqual(user.role, User.UserChoices.SELLER)
        self.assertTrue(user.check_password('Amina-Designs-2026!'))
        self.assertTrue(hasattr(user, 'sellerprofile'))

    def test_rejects_an_email_that_already_exists_regardless_of_case(self):
        User.objects.create_user(
            username='amina@example.com',
            email='amina@example.com',
            password='Amina-Designs-2026!',
            role=User.UserChoices.SELLER,
        )
        serializer = DesignerRegistrationSerializer(
            data={
                'name': 'Another Amina',
                'email': 'AMINA@example.com',
                'password': 'Another-Password-2026!',
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)

    def test_non_seller_accounts_do_not_receive_a_seller_profile(self):
        user = User.objects.create_user(
            username='admin@example.com',
            email='admin@example.com',
            password='Admin-Password-2026!',
            role=User.UserChoices.ADMIN,
        )

        self.assertFalse(hasattr(user, 'sellerprofile'))


class DesignerAuthenticationApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='amina@example.com',
            email='amina@example.com',
            password='Amina-Designs-2026!',
            role=User.UserChoices.SELLER,
            name='Amina Designer',
        )

    def test_login_accepts_email_and_returns_identity_claims(self):
        response = self.client.post(
            reverse('user-login'),
            {'email': 'AMINA@EXAMPLE.COM', 'password': 'Amina-Designs-2026!'},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['email'], self.user.email)
        self.assertEqual(response.data['id'], self.user.id)

        token = AccessToken(response.data['access'])
        self.assertEqual(token['email'], self.user.email)
        self.assertEqual(token['role'], User.UserChoices.SELLER)

    def test_login_rejects_an_invalid_password(self):
        response = self.client.post(
            reverse('user-login'),
            {'email': self.user.email, 'password': 'Wrong-Password-2026!'},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 401)


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    FRONTEND_BASE_URL='http://localhost:5173',
    DEFAULT_FROM_EMAIL='no-reply@example.com',
)
class PasswordRecoveryApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='reset@example.com',
            email='reset@example.com',
            password='Original-Password-2026!',
            role=User.UserChoices.SELLER,
            name='Reset Designer',
        )

    def test_unknown_email_has_same_accepted_response_without_sending(self):
        known = self.client.post(
            reverse('password-reset-request'), {'email': self.user.email}, format='json'
        )
        self.assertEqual(known.status_code, 202)
        self.assertEqual(len(mail.outbox), 1)

        mail.outbox.clear()
        unknown = self.client.post(
            reverse('password-reset-request'), {'email': 'missing@example.com'}, format='json'
        )
        self.assertEqual(unknown.status_code, known.status_code)
        self.assertEqual(unknown.data, known.data)
        self.assertEqual(mail.outbox, [])

    def test_reset_link_changes_password_and_cannot_be_reused(self):
        response = self.client.post(
            reverse('password-reset-request'), {'email': self.user.email}, format='json'
        )
        self.assertEqual(response.status_code, 202)
        match = re.search(r'/reset-password/([^/]+)/([^\s]+)', mail.outbox[0].body)
        self.assertIsNotNone(match)
        uid, token = match.groups()
        url = reverse('password-reset-confirm', kwargs={'uid': uid, 'token': token})

        reset = self.client.post(url, {'new_password': 'New-Password-2026!'}, format='json')
        self.assertEqual(reset.status_code, 200, reset.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('New-Password-2026!'))
        self.assertFalse(self.user.check_password('Original-Password-2026!'))

        reused = self.client.post(url, {'new_password': 'Another-Password-2026!'}, format='json')
        self.assertEqual(reused.status_code, 400)
        self.assertIn('invalid or has expired', reused.data['detail'])

    def test_invalid_link_and_invalid_password_do_not_change_password(self):
        invalid = self.client.post(
            reverse('password-reset-confirm', kwargs={'uid': 'bad', 'token': 'bad'}),
            {'new_password': 'New-Password-2026!'}, format='json'
        )
        self.assertEqual(invalid.status_code, 400)

        response = self.client.post(
            reverse('password-reset-request'), {'email': self.user.email}, format='json'
        )
        match = re.search(r'/reset-password/([^/]+)/([^\s]+)', mail.outbox[-1].body)
        uid, token = match.groups()
        weak = self.client.post(
            reverse('password-reset-confirm', kwargs={'uid': uid, 'token': token}),
            {'new_password': 'password'}, format='json'
        )
        self.assertEqual(weak.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('Original-Password-2026!'))


class SellerProfilePermissionTests(TestCase):
    def setUp(self):
        # Create Seller A
        self.seller_a = User.objects.create_user(
            username='sellerA@example.com',
            email='sellerA@example.com',
            password='Password123!',
            role=User.UserChoices.SELLER,
            name='Seller A'
        )
        self.profile_a = self.seller_a.sellerprofile

        # Create Seller B
        self.seller_b = User.objects.create_user(
            username='sellerB@example.com',
            email='sellerB@example.com',
            password='Password123!',
            role=User.UserChoices.SELLER,
            name='Seller B'
        )
        self.profile_b = self.seller_b.sellerprofile

        # Create Admin
        self.admin = User.objects.create_user(
            username='admin@example.com',
            email='admin@example.com',
            password='Password123!',
            role=User.UserChoices.ADMIN,
            name='Admin User'
        )

        # Create Buyer
        self.buyer = User.objects.create_user(
            username='buyer@example.com',
            email='buyer@example.com',
            password='Password123!',
            role=User.UserChoices.BUYER,
            name='Buyer User'
        )

    def get_auth_header(self, user):
        token = AccessToken.for_user(user)
        return {'HTTP_AUTHORIZATION': f'Bearer {token}'}

    def test_seller_can_retrieve_own_profile(self):
        url = reverse('seller-detail', kwargs={'pk': self.profile_a.pk})
        response = self.client.get(url, **self.get_auth_header(self.seller_a))
        self.assertEqual(response.status_code, 200)

    def test_seller_can_update_own_profile(self):
        url = reverse('seller-detail', kwargs={'pk': self.profile_a.pk})
        response = self.client.put(
            url,
            {'phone': '0700000000', 'bio': 'Updated bio'},
            content_type='application/json',
            **self.get_auth_header(self.seller_a)
        )
        self.assertEqual(response.status_code, 200)
        self.profile_a.refresh_from_db()
        self.assertEqual(self.profile_a.bio, 'Updated bio')

    def test_seller_cannot_retrieve_other_profile(self):
        url = reverse('seller-detail', kwargs={'pk': self.profile_b.pk})
        response = self.client.get(url, **self.get_auth_header(self.seller_a))
        self.assertEqual(response.status_code, 403)

    def test_seller_cannot_update_other_profile(self):
        url = reverse('seller-detail', kwargs={'pk': self.profile_b.pk})
        response = self.client.put(
            url,
            {'phone': '0700000000', 'bio': 'Hacked bio'},
            content_type='application/json',
            **self.get_auth_header(self.seller_a)
        )
        self.assertEqual(response.status_code, 403)

    def test_admin_can_retrieve_and_update_any_profile(self):
        url = reverse('seller-detail', kwargs={'pk': self.profile_a.pk})
        response = self.client.put(
            url,
            {'phone': '0799999999', 'bio': 'Admin updated bio'},
            content_type='application/json',
            **self.get_auth_header(self.admin)
        )
        self.assertEqual(response.status_code, 200)
