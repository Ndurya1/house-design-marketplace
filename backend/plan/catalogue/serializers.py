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
    bedrooms = serializers.IntegerField(required=False, allow_null=True)
    storeys = serializers.IntegerField(required=False, allow_null=True)
    floor_area = serializers.DecimalField(
        required=False,
        allow_null=True,
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.01'),
    )
    package_contents = serializers.JSONField(required=False)

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
            'bedrooms',
            'storeys',
            'floor_area',
            'floor_area_unit',
            'plot_requirements',
            'package_contents',
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

    def to_internal_value(self, data):
        # Multipart forms submit cleared optional numeric fields as empty strings.
        # Convert those to JSON null so sellers can remove previously saved metadata.
        if hasattr(data, 'copy'):
            data = data.copy()
            for field in ['bedrooms', 'storeys', 'floor_area']:
                if data.get(field) == '':
                    data[field] = None
        return super().to_internal_value(data)

    def validate_bedrooms(self, value):
        if value is not None and value < 1:
            raise serializers.ValidationError('Bedrooms must be at least 1.')
        return value

    def validate_storeys(self, value):
        if value is not None and value < 1:
            raise serializers.ValidationError('Storeys must be at least 1.')
        return value

    def validate_package_contents(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('Package contents must be a list of items.')
        if len(value) > 20:
            raise serializers.ValidationError('Package contents cannot contain more than 20 items.')
        cleaned = []
        for item in value:
            if not isinstance(item, str) or not item.strip():
                raise serializers.ValidationError('Each package item must be a non-empty text value.')
            item = item.strip()
            if len(item) > 120:
                raise serializers.ValidationError('Each package item must be 120 characters or fewer.')
            cleaned.append(item)
        return cleaned

    def validate_title(self, value):
        title = value.strip()
        if not title:
            raise serializers.ValidationError('A title is required.')
        return title
