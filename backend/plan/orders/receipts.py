from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .fulfilment import authorize_session
from .models import Orders


class ReceiptView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, reference):
        order = get_object_or_404(Orders.objects.prefetch_related('items'), reference=reference)
        authorize_session(request, order)
        payment = order.payment_attempts.filter(status='succeeded').order_by('confirmed_at', 'pk').first()
        if (order.status != 'completed' or payment is None or not payment.receipt_number
                or payment.confirmed_at is None):
            raise PermissionDenied('A receipt is available only after verified payment.')
        response = Response({
            'order_reference': str(order.reference),
            'payment_reference': str(payment.reference),
            'mpesa_receipt': payment.receipt_number,
            'paid_at': payment.confirmed_at.isoformat(),
            'currency': order.currency,
            'total': str(order.total),
            'items': [{
                'title': item.title_snapshot,
                'designer': item.seller_name_snapshot,
                'price': str(item.unit_price) if item.unit_price is not None else None,
            } for item in order.items.order_by('pk')],
        })
        response['Cache-Control'] = 'private, no-store'
        return response
