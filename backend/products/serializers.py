from decimal import Decimal

from rest_framework import serializers

from .models import Product


class ProductSerializer(serializers.ModelSerializer):

    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Product

        fields = [
            "id",

            "hsn_code",
            "name",
            "grade",

            "cartons_per_unit",
            "boxes_per_carton",
            "pieces_per_box",

            "purchase_rate_per_piece",
            "box_purchase_rate",
            "box_retail_rate",

            "bill_rate",
            "retail_rate",
            "new_retail_rate",
            "mrp",

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

        if obj.created_by:
            return obj.created_by.username

        return None

    def get_updated_by_name(self, obj):

        if obj.updated_by:
            return obj.updated_by.username

        return None

    def validate_hsn_code(self, value):

        value = value.strip().upper()

        if not value:
            raise serializers.ValidationError(
                "HSN code is required."
            )

        return value

    def validate_name(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Product name is required."
            )

        return value

    def validate(self, attrs):

        positive_integer_fields = [
            "cartons_per_unit",
            "boxes_per_carton",
            "pieces_per_box",
        ]

        for field in positive_integer_fields:

            if field in attrs:

                value = attrs[field]

                if value <= 0:
                    raise serializers.ValidationError({
                        field: (
                            "Value must be greater than 0."
                        )
                    })

        money_fields = [
            "purchase_rate_per_piece",
            "box_purchase_rate",
            "box_retail_rate",
            "bill_rate",
            "retail_rate",
            "new_retail_rate",
            "mrp",
        ]

        for field in money_fields:

            if field in attrs:

                value = attrs[field]

                if value < Decimal("0"):
                    raise serializers.ValidationError({
                        field: (
                            "Value cannot be negative."
                        )
                    })

        return attrs