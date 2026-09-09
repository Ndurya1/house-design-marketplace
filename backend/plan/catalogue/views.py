from django.db.models import Q
from django.http import FileResponse

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from users.models import SellerProfile, User
from users.permissions import IsSuperAdmin

from .models import Catalogue, Category
from .serializers import CatalogueSerializer, CategorySerializer, CatalogueQuerySerializer
from .pagination import CataloguePagination
from .services import public_listings, review_listing
from .permissions import IsSeller, IsSellerOwnerOrAdmin


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated(), IsSuperAdmin()]

    def get_queryset(self):
        queryset = Category.objects.all().order_by('group', 'name')
        user = self.request.user
        if user.is_authenticated and user.role == User.UserChoices.ADMIN:
            return queryset
        return queryset.filter(is_active=True)

    def perform_destroy(self, instance):
        if instance.catalogues.exists():
            raise ValidationError(
                {'detail': 'A category with listings cannot be deleted. Deactivate it instead.'}
            )
        instance.delete()


class CatalogueViewSet(viewsets.ModelViewSet):
    serializer_class = CatalogueSerializer
    pagination_class = CataloguePagination
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_permissions(self):
        if self.action == 'download_plan_file':
            return [IsAuthenticated(), IsSellerOwnerOrAdmin()]
        if self.action in ['list', 'retrieve', 'related']:
            return [AllowAny()]
        if self.action in ['mine', 'create', 'submit']:
            return [IsAuthenticated(), IsSeller(), IsSellerOwnerOrAdmin()]
        if self.action in ['publish', 'return_to_draft']:
            return [IsAuthenticated(), IsSuperAdmin()]
        return [IsAuthenticated(), IsSellerOwnerOrAdmin()]

    def get_queryset(self):
        queryset = Catalogue.objects.select_related('seller__user', 'category')
        user = self.request.user

        if self.action in ['list', 'retrieve', 'related']:
            return public_listings(queryset)

        if user.is_authenticated and user.role == User.UserChoices.SELLER:
            queryset = queryset.filter(
                Q(status=Catalogue.ListingStatus.PUBLISHED) |
                Q(seller__user=user)
            )
        elif not (user.is_authenticated and user.role == User.UserChoices.ADMIN):
            queryset = queryset.filter(status=Catalogue.ListingStatus.PUBLISHED)

        return queryset

    def list(self, request, *args, **kwargs):
        query = CatalogueQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        params = query.validated_data
        queryset = self.get_queryset()
        if params.get('search'):
            term = params['search']
            queryset = queryset.filter(Q(title__icontains=term) | Q(description__icontains=term))
        if 'category' in params:
            queryset = queryset.filter(category_id=params['category'])
        if 'min_price' in params:
            queryset = queryset.filter(price__gte=params['min_price'])
        if 'max_price' in params:
            queryset = queryset.filter(price__lte=params['max_price'])
        ordering = {
            'newest': ('-created_at', '-id'),
            'price_low': ('price', 'id'),
            'price_high': ('-price', 'id'),
        }
        queryset = queryset.order_by(*ordering[params['ordering']])
        page = self.paginate_queryset(queryset)
        return self.get_paginated_response(self.get_serializer(page, many=True).data)

    @action(detail=True, methods=['get'])
    def related(self, request, pk=None):
        listing = self.get_object()
        queryset = (self.get_queryset().filter(category_id=listing.category_id)
                    .exclude(pk=listing.pk).order_by('-created_at', '-id')[:4])
        return Response(self.get_serializer(queryset, many=True).data)

    @action(detail=False, methods=['get'])
    def mine(self, request):
        queryset = (
            Catalogue.objects
            .select_related('seller__user', 'category')
            .filter(seller__user=request.user)
        )
        return Response(self.get_serializer(queryset, many=True).data)

    @action(detail=True, methods=['get'], url_path='plan-file')
    def download_plan_file(self, request, pk=None):
        listing = self.get_object()
        if not listing.plan_file:
            raise NotFound('No plan file is attached.')
        try:
            file_handle = listing.plan_file.open('rb')
        except FileNotFoundError:
            raise NotFound('The plan file is unavailable.')
        response = FileResponse(
            file_handle, as_attachment=True,
            filename=f'plan-{listing.pk}.pdf', content_type='application/pdf',
        )
        response['Cache-Control'] = 'private, no-store'
        response['X-Content-Type-Options'] = 'nosniff'
        return response

    def perform_create(self, serializer):
        if self.request.user.role != User.UserChoices.SELLER:
            raise PermissionDenied('Only sellers can create house plan listings.')
        seller = SellerProfile.objects.filter(user=self.request.user).first()
        if not seller:
            raise ValidationError(
                {"detail": "Only registered sellers with a profile can list house plans."}
            )
        serializer.save(seller=seller)

    def perform_update(self, serializer):
        listing = self.get_object()
        if (
            self.request.user.role == User.UserChoices.SELLER
            and listing.status != Catalogue.ListingStatus.DRAFT
        ):
            raise PermissionDenied('Only draft listings can be edited.')
        serializer.save()

    def perform_destroy(self, instance):
        if (
            self.request.user.role == User.UserChoices.SELLER
            and instance.status != Catalogue.ListingStatus.DRAFT
        ):
            raise PermissionDenied('Only draft listings can be deleted.')
        instance.delete()

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        listing = self.get_object()
        if request.user.role != User.UserChoices.SELLER:
            raise PermissionDenied('Only the owning seller can submit a listing for review.')
        if listing.status != Catalogue.ListingStatus.DRAFT:
            raise ValidationError({'detail': 'Only draft listings can be submitted for review.'})
        if errors := listing.submission_errors():
            raise ValidationError(errors)

        listing.status = Catalogue.ListingStatus.IN_REVIEW
        listing.save(update_fields=['status', 'updated_at'])
        return Response(self.get_serializer(listing).data)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        listing = self.get_object()
        listing = review_listing(actor=request.user, listing_id=listing.pk, publish=True)
        return Response(self.get_serializer(listing).data)

    @action(detail=True, methods=['post'], url_path='return-to-draft')
    def return_to_draft(self, request, pk=None):
        listing = self.get_object()
        listing = review_listing(actor=request.user, listing_id=listing.pk, publish=False)
        return Response(self.get_serializer(listing).data)
