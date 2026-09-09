from rest_framework import serializers
from .models import PaymentAttempt


class PaymentInitiationSerializer(serializers.Serializer):
    order_reference = serializers.UUIDField()
    idempotency_key = serializers.UUIDField()

    def to_internal_value(self, data):
        if hasattr(data, 'keys'):
            unknown = set(data.keys()) - set(self.fields)
            if unknown:
                raise serializers.ValidationError({key: 'This field is not accepted.' for key in unknown})
        return super().to_internal_value(data)


class PaymentAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentAttempt
        fields = ['reference', 'status', 'amount', 'error_code', 'created_at', 'updated_at']
        read_only_fields = fields
