from django.db import transaction
from rest_framework.exceptions import ValidationError
from users.models import User
from users.operations import record_operation, require_operator
from .models import Catalogue


def public_listings(queryset):
    return queryset.filter(
        status=Catalogue.ListingStatus.PUBLISHED,
        category__is_active=True, seller__user__is_active=True,
        seller__user__role=User.UserChoices.SELLER,
    )


@transaction.atomic
def review_listing(*, actor, listing_id, publish):
    require_operator(actor)
    # Re-read under a lock so a stale admin page cannot repeat a transition.
    listing = Catalogue.objects.select_for_update().get(pk=listing_id)
    if publish:
        if listing.status != Catalogue.ListingStatus.IN_REVIEW:
            raise ValidationError({'detail': 'Only listings in review can be published.'})
        errors = listing.submission_errors()
        if not listing.seller_id or not listing.seller.user.is_active or listing.seller.user.role != User.UserChoices.SELLER:
            errors['seller'] = 'An active designer is required.'
        if errors:
            raise ValidationError(errors)
        listing.status = Catalogue.ListingStatus.PUBLISHED
    else:
        if listing.status == Catalogue.ListingStatus.DRAFT:
            raise ValidationError({'detail': 'The listing is already a draft.'})
        listing.status = Catalogue.ListingStatus.DRAFT
    listing.save(update_fields=['status', 'updated_at'])
    record_operation(actor, listing, 'Listing published.' if publish else 'Listing returned to draft.')
    return listing
