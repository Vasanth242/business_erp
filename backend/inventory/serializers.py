from rest_framework import serializers

from .models import StockLocation, StockTransaction


class StockLocationSerializer(serializers.ModelSerializer):

    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = StockLocation

        fields = [
            "id",
            "code",
            "name",
            "description",
            "status",

            "created_at",
            "created_by_name",

            "updated_at",
            "updated_by_name",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "created_by_name",
            "updated_at",
            "updated_by_name",
        ]

    def get_created_by_name(self, obj):

        if not obj.created_by:
            return None

        return (
            obj.created_by.get_full_name()
            or obj.created_by.username
        )

    def get_updated_by_name(self, obj):

        if not obj.updated_by:
            return None

        return (
            obj.updated_by.get_full_name()
            or obj.updated_by.username
        )

    def validate_code(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Location code is required."
            )

        return value

    def validate_name(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Location name is required."
            )

        return value


class StockTransactionSerializer(
    serializers.ModelSerializer
):

    product_name = serializers.CharField(
        source="product.name",
        read_only=True,
    )

    product_hsn = serializers.CharField(
        source="product.hsn_code",
        read_only=True,
    )

    location_name = serializers.CharField(
        source="location.name",
        read_only=True,
    )

    location_code = serializers.CharField(
        source="location.code",
        read_only=True,
    )

    transaction_type_display = serializers.CharField(
        source="get_transaction_type_display",
        read_only=True,
    )

    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta:

        model = StockTransaction

        fields = [
            "id",

            "product",
            "product_name",
            "product_hsn",

            "location",
            "location_name",
            "location_code",

            "transaction_type",
            "transaction_type_display",

            "quantity",

            "reference_number",
            "transaction_date",
            "notes",

            "created_at",
            "created_by_name",

            "updated_at",
            "updated_by_name",
        ]

        read_only_fields = [
            "id",

            "product_name",
            "product_hsn",

            "location_name",
            "location_code",

            "transaction_type_display",

            "created_at",
            "created_by_name",

            "updated_at",
            "updated_by_name",
        ]

    def get_created_by_name(self, obj):

        if not obj.created_by:
            return None

        return (
            obj.created_by.get_full_name()
            or obj.created_by.username
        )

    def get_updated_by_name(self, obj):

        if not obj.updated_by:
            return None

        return (
            obj.updated_by.get_full_name()
            or obj.updated_by.username
        )

    def validate_quantity(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "Quantity must be greater than zero."
            )

        return value

    def validate_reference_number(self, value):

        return value.strip()

class StockBalanceSerializer(serializers.Serializer):

    product = serializers.IntegerField()

    product_name = serializers.CharField()

    product_hsn = serializers.CharField()

    location = serializers.IntegerField()

    location_name = serializers.CharField()

    opening = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    purchases = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    sales = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    stock_in = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    stock_out = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    adjustment_in = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    adjustment_out = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    current_stock = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )