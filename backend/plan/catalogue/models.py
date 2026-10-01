from decimal import Decimal
from pathlib import Path
from uuid import uuid4

from django.core.validators import MinValueValidator
from django.db import models

from .validators import validate_plan_file, validate_thumbnail_file
from .storage import private_plan_storage


def plan_file_upload_path(instance, filename):
    return f'plan_files/{uuid4()}.pdf'


def thumbnail_upload_path(instance, filename):
    suffix = Path(filename).suffix.lower() or '.jpg'
    return f'listing_thumbnails/{uuid4()}{suffix}'


class Category(models.Model):
    class Group(models.TextChoices):
        RESIDENTIAL = 'residential', 'Residential'
        COMMERCIAL = 'commercial', 'Commercial'
        OTHER = 'other', 'Other'

    name = models.CharField(max_length=100, unique=True)
    group = models.CharField(max_length=20, choices=Group.choices)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Catalogue(models.Model):
    class AreaUnit(models.TextChoices):
        SQUARE_METRES = 'sqm', 'Square metres'
        SQUARE_FEET = 'sqft', 'Square feet'

    class ListingStatus(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        IN_REVIEW = 'in_review', 'In review'
        PUBLISHED = 'published', 'Published'

    title = models.CharField(max_length=200)
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='catalogues',
    )
    status = models.CharField(
        max_length=20,
        choices=ListingStatus.choices,
        default=ListingStatus.DRAFT,
        db_index=True,
    )
    description = models.TextField(blank=True)
    bedrooms = models.PositiveSmallIntegerField(null=True, blank=True)
    storeys = models.PositiveSmallIntegerField(null=True, blank=True)
    floor_area = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    floor_area_unit = models.CharField(
        max_length=4,
        choices=AreaUnit.choices,
        default=AreaUnit.SQUARE_METRES,
    )
    plot_requirements = models.TextField(blank=True)
    package_contents = models.JSONField(default=list, blank=True)
    plan_file = models.FileField(
        storage=private_plan_storage,
        upload_to=plan_file_upload_path,
        blank=True,
        null=True,
        validators=[validate_plan_file],
    )
    price = models.DecimalField(
        max_digits=19,
        decimal_places=4,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    thumbnail = models.ImageField(
        upload_to=thumbnail_upload_path,
        blank=True,
        null=True,
        validators=[validate_thumbnail_file],
    )
    seller = models.ForeignKey(
        'users.SellerProfile',
        on_delete=models.CASCADE,
        related_name='catalogues',
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.category})"

    def submission_errors(self):
        errors = {}

        if not self.category.is_active:
            errors['category'] = 'Choose an active category before submission.'
        if not self.title.strip():
            errors['title'] = 'A title is required before submission.'
        if self.price is None or self.price < Decimal('0.01'):
            errors['price'] = 'Price must be at least 0.01.'

        if not self.description or len(self.description.strip()) < 50:
            errors['description'] = 'Provide at least 50 characters of description before submission.'
        if not self.thumbnail:
            errors['thumbnail'] = 'A thumbnail is required before submission.'
        if not self.plan_file:
            errors['plan_file'] = 'A PDF plan file is required before submission.'

        return errors
