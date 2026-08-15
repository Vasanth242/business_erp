from decimal import Decimal

from rest_framework import serializers

from .models import Customer, Route


class RouteSerializer(serializers.ModelSerializer):

    customer_count = serializers.IntegerField(
        read_only=True
    )

    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta:

        model = Route

        fields = [
            "id",

            "code",
            "name",
            "description",
            "status",

            "customer_count",

            "created_at",
            "created_by_name",

            "updated_at",
            "updated_by_name",
        ]

        read_only_fields = [
            "id",
            "customer_count",

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
                "Route code is required."
            )

        return value

    def validate_name(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Route name is required."
            )

        return value

    def validate_description(self, value):

        return value.strip()


class CustomerSerializer(serializers.ModelSerializer):

    route_name = serializers.CharField(
        source="route.name",
        read_only=True,
    )

    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta:

        model = Customer

        fields = [
            "id",

            "code",
            "shop_name",
            "contact_person",

            "mobile",
            "alternate_mobile",

            "address",

            "route",
            "route_name",

            "customer_type",

            "credit_limit",
            "opening_balance",

            "notes",

            "status",

            "created_at",
            "created_by_name",

            "updated_at",
            "updated_by_name",
        ]

        read_only_fields = [
            "id",

            "route_name",

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
                "Customer code is required."
            )

        return value

    def validate_shop_name(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Shop name is required."
            )

        return value

    def validate_contact_person(self, value):

        return value.strip()

    def validate_address(self, value):

        return value.strip()

    def validate_notes(self, value):

        return value.strip()

    def validate_credit_limit(self, value):

        if value < 0:
            raise serializers.ValidationError(
                "Credit limit cannot be negative."
            )

        return value

    def validate_opening_balance(self, value):

        if value < 0:
            raise serializers.ValidationError(
                "Opening balance cannot be negative."
            )

        return value

    def validate_mobile(self, value):

        value = value.strip()

        if not value:
            return value

        if not value.isdigit():
            raise serializers.ValidationError(
                "Mobile number must contain only digits."
            )

        if not 7 <= len(value) <= 15:
            raise serializers.ValidationError(
                "Mobile number must contain 7 to 15 digits."
            )

        return value

    def validate_alternate_mobile(self, value):

        value = value.strip()

        if not value:
            return value

        if not value.isdigit():
            raise serializers.ValidationError(
                "Alternate mobile number must contain only digits."
            )

        if not 7 <= len(value) <= 15:
            raise serializers.ValidationError(
                "Alternate mobile number must contain 7 to 15 digits."
            )

        return value

    def validate_route(self, value):

        if value.status == Route.Status.INACTIVE:

            raise serializers.ValidationError(
                "Cannot assign a customer to an inactive route."
            )

        return value

class CustomerOutstandingInvoiceSerializer(
    serializers.Serializer
):

    sale_id = serializers.IntegerField()

    invoice_number = serializers.CharField()

    sale_date = serializers.DateField()

    total_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    paid_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    outstanding_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    payment_status = serializers.CharField()


class CustomerOutstandingSummarySerializer(
    serializers.Serializer
):

    total_sales = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    total_paid = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    invoice_outstanding = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    opening_balance = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    total_outstanding = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )


class CustomerOutstandingSerializer(
    serializers.Serializer
):

    customer = serializers.DictField()

    summary = CustomerOutstandingSummarySerializer()

    invoices = CustomerOutstandingInvoiceSerializer(
        many=True,
    )