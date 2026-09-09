from django.urls import path
from .views import PaymentInitiationView, PaymentCallbackView

urlpatterns = [
    path('payments/', PaymentInitiationView.as_view(), name='payments'),
    path('payments/callback/', PaymentCallbackView.as_view(), name='payment-callback'),
]
