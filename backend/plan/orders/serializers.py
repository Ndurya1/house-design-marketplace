import re
from decimal import Decimal

from rest_framework import serializers
from .models import Orders, OrderItem, payments


class GuestOrderCreateSerializer(serializers.Serializer):
    guest_email = serializers.EmailField()
    guest_phone = serializers.CharField(max_length=30)
    plan_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1, max_value=2147483647),
        min_length=1, max_length=20,
    )

    def to_internal_value(self, data):
        if hasattr(data, 'keys'):
            unknown = set(data.keys()) - set(self.fields)
            if unknown:
                raise serializers.ValidationError({key: 'This field is not accepted.' for key in unknown})
        return super().to_internal_value(data)

    def validate_plan_ids(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError('Each plan can appear only once.')
        return value

    def validate_guest_phone(self, value):
        phone = re.sub(r'[\s()-]', '', value)
        if re.fullmatch(r'0[17][0-9]{8}', phone):
            phone = '+254' + phone[1:]
        elif re.fullmatch(r'254[17][0-9]{8}', phone):
            phone = '+' + phone
        if not re.fullmatch(r'\+254[17][0-9]{8}', phone):
            raise serializers.ValidationError('Enter a Kenyan mobile number, such as +254712345678.')
        return phone


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['plan_id_snapshot', 'seller_id_snapshot', 'title_snapshot',
                  'seller_name_snapshot', 'unit_price']
        read_only_fields = fields


class OrdersSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Orders
        fields = ['reference', 'status', 'guest_email', 'guest_phone', 'currency', 'total',
                  'is_legacy', 'created_at', 'updated_at', 'items']
        read_only_fields = fields


class SellerOrderSerializer(serializers.ModelSerializer):
    # The view prefetches only this designer's items. Never use the complete order total here.
    items = OrderItemSerializer(source='seller_items', many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()

    def get_subtotal(self, obj):
        if any(item.unit_price is None for item in obj.seller_items):
            return None
        return format(sum((item.unit_price for item in obj.seller_items), Decimal('0')), '.4f')

    class Meta:
        model = Orders
        fields = ['reference', 'status', 'currency', 'is_legacy', 'created_at', 'items', 'subtotal']
        read_only_fields = fields


class PaymentsSerializer(serializers.ModelSerializer):
    class Meta:
        model = payments
        fields = ['id', 'payment_method']
        read_only_fields = fields
