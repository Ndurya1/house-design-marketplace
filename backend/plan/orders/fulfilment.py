import hashlib

from django.conf import settings
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied, APIException
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .checkout_tokens import validate_session_token, issue_download_token, validate_download_token
from .models import Orders, DownloadGrant


class DownloadUnavailable(APIException):
    status_code = 503
    default_detail = 'Your payment is confirmed, but this download is temporarily unavailable.'


def owning_buyer(request, order):
    return bool(request.user.is_authenticated and order.buyer_id and order.buyer.user_id == request.user.pk)


def authorize_session(request, order):
    if not owning_buyer(request, order) and not validate_session_token(request.headers.get('X-Checkout-Session'), order):
        raise PermissionDenied('Your checkout session has expired or is unavailable.')


def valid_grant(grant):
    return (grant.revoked_at is None and grant.payment.status == 'succeeded'
            and grant.payment.order.status == 'completed'
            and grant.snapshot.order_item.order_id == grant.payment.order_id)


def snapshot_available(snapshot):
    try:
        with snapshot.file.open('rb') as file:
            return hashlib.file_digest(file, 'sha256').hexdigest() == snapshot.sha256
    except OSError:
        return False


class CheckoutStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, reference):
        order = get_object_or_404(Orders.objects.prefetch_related('items__file_snapshot__grant'), reference=reference)
        authorize_session(request, order)
        attempt = order.payment_attempts.order_by('-created_at', '-pk').first()
        if order.status == 'cancelled':
            state = 'cancelled'
        elif order.status == 'completed':
            state = 'paid' if order.payment_attempts.filter(status='succeeded').exists() else 'needs_support'
        else:
            state = attempt.status if attempt else 'unpaid'
        items = []
        for item in order.items.all():
            snapshot = getattr(item, 'file_snapshot', None)
            grant = getattr(snapshot, 'grant', None) if snapshot else None
            available = bool(grant and valid_grant(grant) and snapshot_available(snapshot))
            items.append({'title': item.title_snapshot, 'grant_reference': str(grant.reference) if grant else None,
                          'download_available': available})
        response = Response({'reference': str(order.reference), 'status': state, 'total': str(order.total),
                             'attempt_reference': str(attempt.reference) if attempt else None,
                             'currency': order.currency, 'payment_enabled': settings.PAYMENT_INITIATION_ENABLED,
                             'items': items})
        response['Cache-Control'] = 'no-store'
        return response


class DownloadTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, reference):
        grant = get_object_or_404(DownloadGrant.objects.select_related('snapshot__order_item__order', 'payment__order'), reference=reference)
        authorize_session(request, grant.snapshot.order_item.order)
        if not valid_grant(grant):
            raise PermissionDenied('This download is not authorized.')
        if not snapshot_available(grant.snapshot):
            raise DownloadUnavailable()
        response = Response({'download_token': issue_download_token(grant)})
        response['Cache-Control'] = 'no-store'
        return response


class PurchasedDownloadView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, reference):
        grant = get_object_or_404(DownloadGrant.objects.select_related('snapshot__order_item__order', 'payment__order'), reference=reference)
        if not owning_buyer(request, grant.snapshot.order_item.order) and not validate_download_token(request.headers.get('X-Download-Token'), grant):
            raise PermissionDenied('The download authorization is invalid or expired.')
        if not valid_grant(grant):
            raise PermissionDenied('This download is not authorized.')
        try:
            file = grant.snapshot.file.open('rb')
            if hashlib.file_digest(file, 'sha256').hexdigest() != grant.snapshot.sha256:
                file.close()
                raise DownloadUnavailable()
            file.seek(0)
        except OSError:
            raise DownloadUnavailable()
        response = FileResponse(file, as_attachment=True, filename=f'plan-{grant.snapshot.order_item.plan_id_snapshot}.pdf', content_type='application/pdf')
        response['Cache-Control'] = 'private, no-store'
        response['X-Content-Type-Options'] = 'nosniff'
        return response
