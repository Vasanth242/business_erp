from decimal import Decimal

from django.db.models import Sum
from rest_framework import serializers

from .models import Payment, PaymentAllocation


class PaymentAllocationSerializer(
    serializers.ModelSerializer
):
    payment_number = serializers.CharField(
        source="payment.payment_number",
        read_only=True,
    )

    invoice_number = serializers.CharField(
        source="sale.invoice_number",
        read_only=True,
    )

    class Meta:
        model = PaymentAllocation

        fields = [
            "id",
            "payment",
            "payment_number",
            "sale",
            "invoice_number",
            "amount",
            "created_at",
            "created_by",
        ]

        read_only_fields = [
            "id",
            "payment_number",
            "invoice_number",
            "created_at",
            "created_by",
        ]


class PaymentSerializer(
    serializers.ModelSerializer
):

    customer_name = serializers.SerializerMethodField()
    supplier_name = serializers.SerializerMethodField()

    payment_type_display = serializers.CharField(
        source="get_payment_type_display",
        read_only=True,
    )

    payment_method_display = serializers.CharField(
        source="get_payment_method_display",
        read_only=True,
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    allocations = PaymentAllocationSerializer(
        many=True,
        read_only=True,
    )

    total_allocated = serializers.SerializerMethodField()
    unallocated_amount = serializers.SerializerMethodField()

    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment

        fields = [
            "id",

            "payment_number",

            "payment_type",
            "payment_type_display",

            "customer",
            "customer_name",

            "supplier",
            "supplier_name",

            "payment_date",

            "payment_method",
            "payment_method_display",

            "amount",

            "reference_number",
            "notes",

            "status",
            "status_display",

            "allocations",
            "total_allocated",
            "unallocated_amount",

            "created_at",
            "created_by_name",

            "updated_at",
            "updated_by_name",
        ]

        read_only_fields = [
            "id",

            "payment_type_display",
            "payment_method_display",
            "status_display",

            "allocations",
            "total_allocated",
            "unallocated_amount",

            "created_at",
            "created_by_name",

            "updated_at",
            "updated_by_name",
        ]

    def validate_payment_number(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Payment number is required."
            )

        return value

    def validate_reference_number(self, value):

        return value.strip()

    def validate_notes(self, value):

        return value.strip()

    def validate_amount(self, value):

        if value <= Decimal("0.00"):
            raise serializers.ValidationError(
                "Payment amount must be greater than zero."
            )

        return value

    def validate(self, attrs):

        payment_type = attrs.get(
            "payment_type",
            getattr(
                self.instance,
                "payment_type",
                None,
            ),
        )

        customer = attrs.get(
            "customer",
            getattr(
                self.instance,
                "customer",
                None,
            ),
        )

        supplier = attrs.get(
            "supplier",
            getattr(
                self.instance,
                "supplier",
                None,
            ),
        )

        if payment_type == Payment.PaymentType.CUSTOMER:

            if not customer:
                raise serializers.ValidationError(
                    {
                        "customer":
                            "Customer is required for customer receipts."
                    }
                )

            if supplier:
                raise serializers.ValidationError(
                    {
                        "supplier":
                            "Supplier cannot be set for customer receipts."
                    }
                )

        elif payment_type == Payment.PaymentType.SUPPLIER:

            if not supplier:
                raise serializers.ValidationError(
                    {
                        "supplier":
                            "Supplier is required for supplier payments."
                    }
                )

            if customer:
                raise serializers.ValidationError(
                    {
                        "customer":
                            "Customer cannot be set for supplier payments."
                    }
                )

        return attrs

    def get_customer_name(self, obj):

        if not obj.customer:
            return None

        return (
            obj.customer.shop_name
        )

    def get_supplier_name(self, obj):

        if not obj.supplier:
            return None

        return obj.supplier.name

    def get_total_allocated(self, obj):

        total = obj.allocations.aggregate(
            total=Sum("amount")
        )["total"]

        return total or Decimal("0.00")

    def get_unallocated_amount(self, obj):

        total_allocated = (
            self.get_total_allocated(obj)
        )

        return (
            obj.amount - total_allocated
        )

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

class PaymentAllocationCreateSerializer(
    serializers.ModelSerializer
):

    class Meta:
        model = PaymentAllocation

        fields = [
            "payment",
            "sale",
            "amount",
        ]

    def validate(self, attrs):

        payment = attrs["payment"]
        sale = attrs["sale"]
        amount = attrs["amount"]

        # -------------------------------------------------
        # Basic amount validation
        # -------------------------------------------------

        if amount <= Decimal("0.00"):
            raise serializers.ValidationError(
                {
                    "amount":
                        "Allocation amount must be greater than zero."
                }
            )

        # -------------------------------------------------
        # Payment must be a customer receipt
        # -------------------------------------------------

        if (
            payment.payment_type
            != Payment.PaymentType.CUSTOMER
        ):
            raise serializers.ValidationError(
                {
                    "payment":
                        "Only customer receipts can be allocated to sales."
                }
            )

        # -------------------------------------------------
        # Payment must be completed
        # -------------------------------------------------

        if (
            payment.status
            != Payment.Status.COMPLETED
        ):
            raise serializers.ValidationError(
                {
                    "payment":
                        "Only completed payments can be allocated."
                }
            )

        # -------------------------------------------------
        # Payment must have a customer
        # -------------------------------------------------

        if not payment.customer_id:
            raise serializers.ValidationError(
                {
                    "payment":
                        "Customer payment must have a customer."
                }
            )

        # -------------------------------------------------
        # Payment customer must match sale customer
        # -------------------------------------------------

        if (
            sale.customer_id
            != payment.customer_id
        ):
            raise serializers.ValidationError(
                {
                    "sale":
                        "Payment customer does not match the sale customer."
                }
            )

        # -------------------------------------------------
        # Sale must be completed
        # -------------------------------------------------

        if (
            sale.status
            != sale.Status.COMPLETED
        ):
            raise serializers.ValidationError(
                {
                    "sale":
                        "Only completed sales can receive payments."
                }
            )

        # -------------------------------------------------
        # Existing amount allocated to this payment
        # -------------------------------------------------

        existing_payment_allocation = (
            PaymentAllocation.objects
            .filter(
                payment=payment,
            )
            .aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )

        payment_remaining = (
            payment.amount
            - existing_payment_allocation
        )

        # -------------------------------------------------
        # Payment allocation cannot exceed payment amount
        # -------------------------------------------------

        if amount > payment_remaining:

            raise serializers.ValidationError(
                {
                    "amount":
                        (
                            "Allocation exceeds the "
                            "remaining payment amount. "
                            f"Remaining: ₹{payment_remaining:.2f}"
                        )
                }
            )

        # -------------------------------------------------
        # Existing amount allocated to this invoice
        # -------------------------------------------------

        existing_sale_allocation = (
            PaymentAllocation.objects
            .filter(
                sale=sale,
            )
            .aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )

        sale_remaining = (
            sale.total_amount
            - existing_sale_allocation
        )

        # -------------------------------------------------
        # Allocation cannot exceed invoice outstanding
        # -------------------------------------------------

        if amount > sale_remaining:

            raise serializers.ValidationError(
                {
                    "amount":
                        (
                            "Allocation exceeds the "
                            "invoice outstanding amount. "
                            f"Outstanding: ₹{sale_remaining:.2f}"
                        )
                }
            )

        return attrs
