from django.db.models import Prefetch
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from users.models import User
from .models import Orders, OrderItem
from .permissions import IsOrderOwnerOrAdmin
from .serializers import GuestOrderCreateSerializer, OrdersSerializer, SellerOrderSerializer, PaymentsSerializer
from .services import create_guest_order
from .checkout_tokens import issue_checkout_token, issue_session_token


class OrdersViewSet(mixins.CreateModelMixin, mixins.ListModelMixin,
                    mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Orders.objects.all()
    permission_classes = [IsOrderOwnerOrAdmin]
    lookup_field = 'reference'

    def get_serializer_class(self):
        if self.action == 'create':
            return GuestOrderCreateSerializer
        if self.request.user.role == User.UserChoices.SELLER:
            return SellerOrderSerializer
        return OrdersSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Orders.objects.order_by('-created_at', '-pk')
        if not user.is_authenticated:
            return queryset.none()
        if user.role == User.UserChoices.ADMIN:
            return queryset.prefetch_related('items')
        if user.role == User.UserChoices.SELLER:
            items = OrderItem.objects.filter(seller__user=user).order_by('pk')
            return queryset.filter(items__seller__user=user).distinct().prefetch_related(
                Prefetch('items', queryset=items, to_attr='seller_items'))
        if user.role == User.UserChoices.BUYER:
            return queryset.filter(buyer__user=user).prefetch_related('items')
        return queryset.none()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        buyer_user = request.user if request.user.is_authenticated and request.user.role == User.UserChoices.BUYER else None
        order = create_guest_order(**serializer.validated_data, buyer_user=buyer_user)
        # Creation receipt describes only the order this caller just submitted, regardless of role.
        data = OrdersSerializer(order).data
        data['checkout_token'] = issue_checkout_token(order)
        data['checkout_session'] = issue_session_token(order)
        response = Response(data, status=status.HTTP_201_CREATED)
        response['Cache-Control'] = 'no-store'
        return response

    @action(detail=True, methods=['get'], url_path='payment-methods')
    def get_payment_methods(self, request, reference=None):
        if request.user.role == User.UserChoices.SELLER:
            raise PermissionDenied('Payment information is available only to the buyer and administrators.')
        order = self.get_object()
        return Response(PaymentsSerializer(order.payments_set.all(), many=True).data)
