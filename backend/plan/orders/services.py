from decimal import Decimal
import hashlib
from uuid import uuid4
from catalogue.storage import private_plan_storage

from django.db import transaction
from rest_framework.exceptions import ValidationError

from catalogue.models import Catalogue, Category
from users.models import Buyer, SellerProfile, User
from .models import Orders, OrderItem, OrderFileSnapshot


def _create_guest_order(*, guest_email, guest_phone, plan_ids, copied_files, buyer=None, buyer_user=None):
    if not 1 <= len(plan_ids) <= 20 or len(set(plan_ids)) != len(plan_ids):
        raise ValidationError({'plan_ids': 'Choose between 1 and 20 distinct plans.'})
    # Lock only plan rows: nullable seller joins cannot be locked with PostgreSQL FOR UPDATE.
    plans = list(Catalogue.objects.select_for_update().filter(pk__in=plan_ids).order_by('pk'))
    sellers = {seller.pk: seller for seller in SellerProfile.objects.select_related('user').filter(
        pk__in=[plan.seller_id for plan in plans])}
    active_categories = set(Category.objects.filter(is_active=True).values_list('pk', flat=True))
    valid = len(plans) == len(plan_ids)
    for plan in plans:
        seller = sellers.get(plan.seller_id)
        valid = valid and bool(
            plan.status == Catalogue.ListingStatus.PUBLISHED and plan.plan_file
            and plan.category_id in active_categories
            and plan.price >= Decimal('0.01') and seller and seller.user.is_active
            and seller.user.role == User.UserChoices.SELLER
        )
    if not valid:
        raise ValidationError({'plan_ids': 'One or more plans are unavailable for purchase.'})

    if buyer_user is not None:
        buyer, _ = Buyer.objects.get_or_create(user=buyer_user, defaults={'phone': guest_phone})
    order = Orders.objects.create(
        guest_email=guest_email, guest_phone=guest_phone, buyer=buyer,
        total=sum((plan.price for plan in plans), Decimal('0')), currency='KES',
    )
    OrderItem.objects.bulk_create([
        OrderItem(order=order, plan=plan, seller=sellers[plan.seller_id],
                  plan_id_snapshot=plan.pk, seller_id_snapshot=plan.seller_id,
                  title_snapshot=plan.title,
                  seller_name_snapshot=sellers[plan.seller_id].user.name or '',
                  unit_price=plan.price)
        for plan in plans
    ])
    storage = private_plan_storage()
    for item, plan in zip(order.items.order_by('pk'), plans):
        try:
            with plan.plan_file.open('rb') as source:
                name = storage.save(f'order_files/{uuid4()}.pdf', source)
            copied_files.append(name)
            with storage.open(name, 'rb') as source:
                digest = hashlib.file_digest(source, 'sha256').hexdigest()
            OrderFileSnapshot.objects.create(order_item=item, file=name, sha256=digest)
        except OSError as exc:
            raise ValidationError({'plan_ids': 'A plan file is unavailable. Please try again later.'}) from exc
    return order


def create_guest_order(**kwargs):
    copied_files = []
    try:
        with transaction.atomic():
            return _create_guest_order(**kwargs, copied_files=copied_files)
    except Exception:
        storage = private_plan_storage()
        for name in copied_files:
            storage.delete(name)
        raise
