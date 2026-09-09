from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .gateway import PaymentUnavailable
from .serializers import PaymentAttemptSerializer, PaymentInitiationSerializer
from .services import initiate_payment


class PaymentInitiationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not settings.PAYMENT_INITIATION_ENABLED:
            raise PaymentUnavailable()
        serializer = PaymentInitiationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attempt = initiate_payment(user=request.user, checkout_token=request.headers.get('X-Checkout-Token'),
                                   **serializer.validated_data)
        response = Response(PaymentAttemptSerializer(attempt).data,
                            status=202 if attempt.status in ['initiating', 'pending', 'unknown'] else 200)
        response['Cache-Control'] = 'no-store'
        return response


class CallbackJSONParser:
    media_type = 'application/json'

    def parse(self, stream, media_type=None, parser_context=None):
        import json
        from decimal import Decimal
        from rest_framework.exceptions import ParseError
        raw = stream.read(16385)
        if len(raw) > 16384:
            raise ParseError('Callback exceeds the size limit.')
        def unique_object(pairs):
            result = {}
            for key, value in pairs:
                if key in result:
                    raise ValueError('Duplicate JSON key')
                result[key] = value
            return result
        try:
            return json.loads(raw, parse_float=Decimal, object_pairs_hook=unique_object)
        except (ValueError, UnicodeError, RecursionError):
            raise ParseError('Invalid callback JSON.')


class PaymentCallbackView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    parser_classes = [CallbackJSONParser]

    def post(self, request):
        from .callbacks import store_callback
        store_callback(request.data)
        # Acknowledge durable receipt only. The reconciliation command performs provider I/O.
        return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})
