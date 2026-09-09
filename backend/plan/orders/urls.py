from rest_framework.routers import DefaultRouter
from django.urls import path
from .fulfilment import CheckoutStatusView, DownloadTokenView, PurchasedDownloadView
from .views import OrdersViewSet
from .receipts import ReceiptView

router = DefaultRouter()
router.register (r'orders', OrdersViewSet)
urlpatterns = router.urls + [
    path('checkout/<uuid:reference>/', CheckoutStatusView.as_view(), name='checkout-status'),
    path('checkout/<uuid:reference>/receipt/', ReceiptView.as_view(), name='checkout-receipt'),
    path('downloads/<uuid:reference>/token/', DownloadTokenView.as_view(), name='download-token'),
    path('downloads/<uuid:reference>/', PurchasedDownloadView.as_view(), name='purchased-download'),
]
