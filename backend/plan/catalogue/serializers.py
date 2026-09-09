from decimal import Decimal
from rest_framework import serializers
from .models import Catalogue, Category


class CatalogueQuerySerializer(serializers.Serializer):
    search = serializers.CharField(required=False, allow_blank=True, max_length=200)
    category = serializers.IntegerField(required=False, min_value=1, max_value=2147483647)
    min_price = serializers.DecimalField(required=False, max_digits=19, decimal_places=4, min_value=Decimal('0'))
    max_price = serializers.DecimalField(required=False, max_digits=19, decimal_places=4, min_value=Decimal('0'))
    ordering = serializers.ChoiceField(choices=['newest', 'price_low', 'price_high'], default='newest')

    def validate(self, attrs):
        minimum, maximum = attrs.get('min_price'), attrs.get('max_price')
        if minimum is not None and maximum is not None and minimum > maximum:
            raise serializers.ValidationError({'max_price': 'Maximum price must be at least minimum price.'})
        return attrs


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'group', 'is_active']


class CatalogueSerializer(serializers.ModelSerializer):
    has_plan_file = serializers.SerializerMethodField()

    def get_has_plan_file(self, obj):
        return bool(obj.plan_file)

    seller_name = serializers.CharField(source='seller.user.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_group = serializers.CharField(source='category.group', read_only=True)
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.filter(is_active=True)
    )

    class Meta:
        model = Catalogue
        fields = [
            'id',
            'title',
            'category',
            'category_name',
            'category_group',
            'status',
            'description',
            'plan_file',
            'has_plan_file',
            'price',
            'thumbnail',
            'seller',
            'seller_name',
            'created_at',
            'updated_at',
        ]
        extra_kwargs = {'plan_file': {'write_only': True}}
        read_only_fields = [
            'seller',
            'status',
            'category_name',
            'category_group',
            'created_at',
            'updated_at',
        ]

    def validate_title(self, value):
        title = value.strip()
        if not title:
            raise serializers.ValidationError('A title is required.')
        return title
