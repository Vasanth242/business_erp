from decimal import Decimal

from rest_framework import serializers

from .models import Purchase, PurchaseItem


class PurchaseItemSerializer(serializers.ModelSerializer):

    product_name = serializers.CharField(
        source="product.name",
        read_only=True,
    )

    product_hsn = serializers.CharField(
        source="product.hsn_code",
        read_only=True,
    )

    class Meta:
        model = PurchaseItem

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

        if value <= 0:
            raise serializers.ValidationError(
                "Quantity must be greater than 0."
            )

        return value

    def validate_rate(self, value):

        if value < 0:
            raise serializers.ValidationError(
                "Rate cannot be negative."
            )

        return value

    def validate_discount(self, value):

        if value < 0:
            raise serializers.ValidationError(
                "Discount cannot be negative."
            )

        return value

    def validate(self, attrs):

        quantity = attrs.get(
            "quantity",
            self.instance.quantity
            if self.instance
            else Decimal("0"),
        )

        rate = attrs.get(
            "rate",
            self.instance.rate
            if self.instance
            else Decimal("0"),
        )

        discount = attrs.get(
            "discount",
            self.instance.discount
            if self.instance
            else Decimal("0"),
        )

        gross_amount = quantity * rate

        if discount > gross_amount:
            raise serializers.ValidationError({
                "discount":
                    "Discount cannot be greater than the item amount."
            })

        return attrs


class PurchaseSerializer(serializers.ModelSerializer):

    supplier_name = serializers.CharField(
        source="supplier.name",
        read_only=True,
    )

    location_name = serializers.CharField(
        source="location.name",
        read_only=True,
    )

    created_by_name = serializers.SerializerMethodField()

    updated_by_name = serializers.SerializerMethodField()

    items = PurchaseItemSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Purchase

        fields = [
            "id",

            "invoice_number",

            "supplier",
            "supplier_name",

            "purchase_date",
            "invoice_date",

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

            "supplier_name",
            "location_name",

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

        if value < 0:
            raise serializers.ValidationError(
                "Discount cannot be negative."
            )

        return value

    def validate_tax(self, value):

        if value < 0:
            raise serializers.ValidationError(
                "Tax cannot be negative."
            )

        return value

    def validate(self, attrs):

        invoice_date = attrs.get(
            "invoice_date"
        )

        purchase_date = attrs.get(
            "purchase_date"
        )

        if (
            invoice_date
            and purchase_date
            and invoice_date > purchase_date
        ):
            raise serializers.ValidationError({
                "invoice_date":
                    "Invoice date cannot be after purchase date."
            })

        return attrs