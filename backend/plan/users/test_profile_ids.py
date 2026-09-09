from django.test import TestCase
from rest_framework.test import APIClient
from django.urls import reverse
from users.models import User, SellerProfile


class SellerProfileIdentityTests(TestCase):
    def test_profile_id_is_returned_and_cannot_be_overwritten(self):
        seller = User.objects.create_user(username='profile-owner', email='owner@example.com', role='seller')
        profile = seller.sellerprofile
        # Explicitly make the two identifiers different instead of relying on sequences.
        replacement_id = profile.pk + seller.pk + 100
        SellerProfile.objects.filter(pk=profile.pk).update(id=replacement_id)
        client = APIClient()
        client.force_authenticate(seller)
        response = client.get(reverse('seller-profile'))
        self.assertEqual(response.data[0]['id'], replacement_id)
        self.assertNotEqual(response.data[0]['id'], response.data[0]['user'])
        response = client.patch(reverse('seller-detail', args=[replacement_id]),
                                {'id': replacement_id + 1, 'bio': 'Updated bio'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['id'], replacement_id)
        self.assertEqual(response.data['bio'], 'Updated bio')
