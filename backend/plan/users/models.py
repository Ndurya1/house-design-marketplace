from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class User(AbstractUser):
    class UserChoices(models.TextChoices):
        BUYER = 'buyer', 'Buyer'
        SELLER = 'seller', 'Seller'
        ADMIN = 'admin', 'Admin'

    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255, blank=True, null=True)
    password = models.CharField(max_length=128)
    role = models.CharField(max_length=10, choices=UserChoices.choices, default=UserChoices.BUYER)


class Buyer(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone = models.CharField(max_length=15)


class SellerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone = models.CharField(max_length=15)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    bio = models.TextField(blank=True)

    def __str__(self):
        return self.user.name or self.user.email


@receiver(post_save, sender=User)
def create_seller_profile(sender, instance, created, **kwargs):
    """Create a seller profile only for newly registered designers."""
    if created and instance.role == User.UserChoices.SELLER:
        SellerProfile.objects.get_or_create(user=instance)
