from decimal import Decimal

from rest_framework import serializers

from .models import Sale, SaleItem


class SaleItemSerializer(serializers.ModelSerializer):

    product_name = serializers.CharField(
        source="product.name",
        read_only=True,
    )

    product_hsn = serializers.CharField(
        source="product.hsn_code",
        read_only=True,
    )

    class Meta:
        model = SaleItem

        fields = [
            "id",

            "product",
            "product_name",
            "product_hsn",

            "quantity",
            "rate",
            "discount",
            "amount",
        ]

        read_only_fields = [
            "id",
            "product_name",
            "product_hsn",
            "amount",
        ]

    def validate_quantity(self, value):

        if value <= Decimal("0.00"):
            raise serializers.ValidationError(
                "Quantity must be greater than zero."
            )

        return value

    def validate_rate(self, value):

        if value < Decimal("0.00"):
            raise serializers.ValidationError(
                "Rate cannot be negative."
            )

        return value

    def validate_discount(self, value):

        if value < Decimal("0.00"):
            raise serializers.ValidationError(
                "Discount cannot be negative."
            )

        return value

    def validate(self, attrs):

        quantity = attrs.get(
            "quantity",
            getattr(
                self.instance,
                "quantity",
                Decimal("0.00"),
            ),
        )

        rate = attrs.get(
            "rate",
            getattr(
                self.instance,
                "rate",
                Decimal("0.00"),
            ),
        )

        discount = attrs.get(
            "discount",
            getattr(
                self.instance,
                "discount",
                Decimal("0.00"),
            ),
        )

        gross = quantity * rate

        if discount > gross:
            raise serializers.ValidationError(
                {
                    "discount":
                        "Discount cannot be greater than "
                        "the item amount."
                }
            )

        return attrs


class SaleSerializer(serializers.ModelSerializer):

    customer_name = serializers.CharField(
        source="customer.shop_name",
        read_only=True,
    )

    location_name = serializers.CharField(
        source="location.name",
        read_only=True,
    )

    items = SaleItemSerializer(
        many=True,
        read_only=True,
    )

    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Sale

        fields = [
            "id",

            "invoice_number",

            "customer",
            "customer_name",

            "sale_date",

            "location",
            "location_name",

            "status",

            "subtotal",
            "discount",
            "tax",
            "total_amount",

            "notes",

            "items",

            "created_at",
            "created_by_name",

            "updated_at",
            "updated_by_name",
        ]

        read_only_fields = [
            "id",

            "customer_name",
            "location_name",

            "status",

            "subtotal",
            "total_amount",

            "items",

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

    def validate_invoice_number(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Invoice number is required."
            )

        return value

    def validate_discount(self, value):

        if value < Decimal("0.00"):
            raise serializers.ValidationError(
                "Discount cannot be negative."
            )

        return value

    def validate_tax(self, value):

        if value < Decimal("0.00"):
            raise serializers.ValidationError(
                "Tax cannot be negative."
            )

        return value

    def validate(self, attrs):

        discount = attrs.get(
            "discount",
            Decimal("0.00"),
        )

        tax = attrs.get(
            "tax",
            Decimal("0.00"),
        )

        if discount < Decimal("0.00"):
            raise serializers.ValidationError(
                {
                    "discount":
                        "Discount cannot be negative."
                }
            )

        if tax < Decimal("0.00"):
            raise serializers.ValidationError(
                {
                    "tax":
                        "Tax cannot be negative."
                }
            )

        return attrs