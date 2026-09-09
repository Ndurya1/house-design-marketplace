from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password

from .models import User, SellerProfile, Buyer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop(self.username_field)
        self.fields['email'] = serializers.EmailField(write_only=True)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['name'] = user.name
        token['role'] = user.role
        return token

    def validate(self, attrs):
        attrs['username'] = attrs.pop('email').strip().lower()
        data = super().validate(attrs)
        data['email'] = self.user.email
        data['name'] = self.user.name
        data['role'] = self.user.role
        data['id'] = self.user.id
        return data

class DesignerRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ['name', 'email', 'password']

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return email

    def create(self, validated_data):
        email = validated_data['email']
        return User.objects.create_user(
            username=email,
            role=User.UserChoices.SELLER,
            **validated_data,
        )


class SellerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellerProfile
        fields = ['id', 'user', 'phone', 'avatar', 'bio']
        read_only_fields = ['id', 'user']


class BuyerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Buyer
        fields = ['user', 'phone']
        read_only_fields = ['user']
