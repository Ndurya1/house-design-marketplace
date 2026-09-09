from .serializers import (
    BuyerSerializer,
    CustomTokenObtainPairSerializer,
    DesignerRegistrationSerializer,
    SellerProfileSerializer,
)
from rest_framework import generics
from .models import User, SellerProfile, Buyer
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import IsAuthenticated
from .permissions import IsSuperAdmin, IsOwnerOrAdmin



# Create your views here.

class UserRegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = DesignerRegistrationSerializer
    permission_classes = [AllowAny]

class UserLoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

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
