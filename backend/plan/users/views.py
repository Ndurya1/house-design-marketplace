import logging

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework.response import Response
from rest_framework import status

from .serializers import (
    BuyerSerializer,
    CustomTokenObtainPairSerializer,
    DesignerRegistrationSerializer,
    SellerProfileSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
)
from rest_framework import generics
from .models import User, SellerProfile, Buyer
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import IsAuthenticated
from .permissions import IsSuperAdmin, IsOwnerOrAdmin

logger = logging.getLogger(__name__)
RESET_REQUEST_MESSAGE = 'If an account exists for this email, a password reset link has been sent.'
RESET_INVALID_MESSAGE = 'This password reset link is invalid or has expired.'



# Create your views here.

class UserRegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = DesignerRegistrationSerializer
    permission_classes = [AllowAny]

class UserLoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class PasswordResetRequestView(generics.GenericAPIView):
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(
            email__iexact=serializer.validated_data['email'], is_active=True
        ).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = f'{settings.FRONTEND_BASE_URL.rstrip("/")}/reset-password/{uid}/{token}'
            try:
                send_mail(
                    'Reset your PlanSoko password',
                    f'Use this link to choose a new password:\n\n{reset_url}\n\n'
                    'If you did not request this, you can ignore this email.',
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False,
                )
            except Exception:
                logger.exception('Password reset email could not be delivered')
        return Response({'detail': RESET_REQUEST_MESSAGE}, status=status.HTTP_202_ACCEPTED)


class PasswordResetConfirmView(generics.GenericAPIView):
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        payload = request.data.copy()
        payload['uid'] = kwargs.get('uid')
        payload['token'] = kwargs.get('token')
        serializer = self.get_serializer(data=payload)
        if not serializer.is_valid():
            return Response({'detail': RESET_INVALID_MESSAGE}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user_id = force_str(urlsafe_base64_decode(serializer.validated_data['uid']))
            user = User.objects.get(pk=user_id, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({'detail': RESET_INVALID_MESSAGE}, status=status.HTTP_400_BAD_REQUEST)
        if not default_token_generator.check_token(user, serializer.validated_data['token']):
            return Response({'detail': RESET_INVALID_MESSAGE}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        return Response({'detail': 'Your password has been reset. You can now sign in.'})

class BuyerView(generics.ListCreateAPIView):
    serializer_class = BuyerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.UserChoices.ADMIN:
            return Buyer.objects.all()
        else:
            return Buyer.objects.filter(user=user)

class SellerProfileView(generics.ListCreateAPIView):
    serializer_class = SellerProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.UserChoices.ADMIN:
            return SellerProfile.objects.all()
        else:
            return SellerProfile.objects.filter(user=user)

class SuperAdminOnlyStatsView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

class SellerProfileDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SellerProfile.objects.all()
    serializer_class = SellerProfileSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
