from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from catalogue.models import Catalogue, Category
from users.models import User


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class PublicCatalogueTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category = Category.objects.create(name='Bungalows', group='residential')
        cls.other = Category.objects.create(name='Villas', group='residential')
        cls.seller = User.objects.create_user(username='designer', email='designer@example.com', role='seller')
        cls.admin = User.objects.create_user(username='admin', email='admin@example.com', role='admin')
        cls.buyer = User.objects.create_user(username='buyer', email='buyer@example.com', role='buyer')
        cls.plans = [Catalogue.objects.create(
            title=f'Garden home {index}', description='Bright courtyard and terrace',
            price=100 + index, category=cls.category, seller=cls.seller.sellerprofile,
            status=Catalogue.ListingStatus.PUBLISHED,
        ) for index in range(15)]
        cls.draft = Catalogue.objects.create(title='Garden private', price=105, category=cls.category,
                                             seller=cls.seller.sellerprofile)
        cls.review = Catalogue.objects.create(title='Garden review', price=105, category=cls.category,
                                              seller=cls.seller.sellerprofile, status='in_review')
        cls.villa = Catalogue.objects.create(title='Garden villa', price=105, category=cls.other,
                                             seller=cls.seller.sellerprofile, status='published')

    def setUp(self):
        self.client = APIClient()
        self.url = reverse('catalogue-list')

    def test_public_visibility_is_same_for_every_role(self):
        for user in [None, self.seller, self.admin, self.buyer]:
            with self.subTest(user=user):
                self.client.force_authenticate(user=user)
                data = self.client.get(self.url).data
                self.assertEqual(data['count'], 16)
                self.assertTrue(all(item['status'] == 'published' for item in data['results']))
                self.assertTrue(all('plan_file' not in item for item in data['results']))
                for hidden in [self.draft, self.review]:
                    for action in ['detail', 'related']:
                        self.assertEqual(self.client.get(reverse(f'catalogue-{action}', args=[hidden.pk])).status_code, 404)

    def test_filters_combine_before_pagination_and_include_price_boundaries(self):
        response = self.client.get(self.url, {'search': 'COURTYARD', 'category': self.category.pk,
            'min_price': '103', 'max_price': '107', 'ordering': 'price_low'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 5)
        self.assertEqual([item['id'] for item in response.data['results']], [plan.pk for plan in self.plans[3:8]])
        self.assertEqual(self.client.get(self.url, {'search': 'Garden home 14'}).data['count'], 1)
        self.assertEqual(self.client.get(self.url, {'search': 'unmatched'}).data['count'], 0)
        self.assertEqual(self.client.get(self.url, {'category': 2147483647}).data['count'], 0)

    def test_invalid_filters_are_rejected(self):
        for params in [{'category': 'abc'}, {'category': 0}, {'category': '9' * 100},
                       {'min_price': '-1'}, {'max_price': 'NaN'}, {'max_price': 'Infinity'},
                       {'min_price': '10', 'max_price': '9'}, {'ordering': 'seller'},
                       {'search': 'a' * 201}]:
            with self.subTest(params=params):
                self.assertEqual(self.client.get(self.url, params).status_code, 400)
        for page in ['0', '-1', 'abc', '999']:
            self.assertEqual(self.client.get(self.url, {'page': page}).status_code, 404)

    def test_pagination_is_stable_and_preserves_filters(self):
        Catalogue.objects.filter(category=self.category, status='published').update(created_at=timezone.now(), price=100)
        for ordering, expected in [('newest', list(reversed(self.plans))), ('price_low', self.plans), ('price_high', self.plans)]:
            with self.subTest(ordering=ordering):
                params = {'category': self.category.pk, 'search': 'garden', 'ordering': ordering}
                first = self.client.get(self.url, params).data
                second = self.client.get(self.url, {**params, 'page': 2}).data
                self.assertEqual(len(first['results']), 12)
                self.assertEqual(len(second['results']), 3)
                self.assertIsNone(first['previous'])
                self.assertIsNone(second['next'])
                self.assertIn('search=garden', first['next'])
                self.assertEqual([item['id'] for item in first['results'] + second['results']], [plan.pk for plan in expected])

    def test_related_plans_are_limited_and_exclude_source_and_private_records(self):
        response = self.client.get(reverse('catalogue-related', args=[self.plans[-1].pk]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['id'] for item in response.data], [plan.pk for plan in reversed(self.plans[-5:-1])])
        self.assertEqual(self.client.get(reverse('catalogue-related', args=[self.villa.pk])).data, [])

    def test_deactivated_category_hides_listings_without_changing_review_status(self):
        self.category.is_active = False
        self.category.save()
        self.assertEqual(self.client.get(self.url, {'category': self.category.pk}).data['count'], 0)
        self.assertEqual(self.client.get(reverse('catalogue-detail', args=[self.plans[0].pk])).status_code, 404)
        self.plans[0].refresh_from_db()
        self.assertEqual(self.plans[0].status, 'published')
        self.category.is_active = True
        self.category.save()
        self.assertEqual(self.client.get(self.url, {'category': self.category.pk}).data['count'], 15)

    def test_designer_management_ignores_browse_filters(self):
        self.client.force_authenticate(user=self.seller)
        data = self.client.get(reverse('catalogue-mine')).data
        self.assertIsInstance(data, list)
        self.assertIn(self.draft.pk, [item['id'] for item in data])
        url = reverse('catalogue-detail', args=[self.draft.pk]) + '?category=invalid&search=unmatched'
        response = self.client.patch(url, {'title': 'Edited draft'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['title'], 'Edited draft')

    def test_list_joins_related_records_without_per_plan_queries(self):
        with self.assertNumQueries(2):
            response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
