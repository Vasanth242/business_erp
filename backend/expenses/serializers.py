from rest_framework import serializers

from .models import Expense, ExpenseCategory


class ExpenseCategorySerializer(
    serializers.ModelSerializer
):

    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta:

        model = ExpenseCategory

        fields = [
            "id",
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

    def validate_name(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Expense category name is required."
            )

        return value

    def validate_description(self, value):

        return value.strip()

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


class ExpenseSerializer(
    serializers.ModelSerializer
):

    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )

    category_status = serializers.CharField(
        source="category.status",
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

    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta:

        model = Expense

        fields = [
            "id",

            "expense_number",
            "expense_date",

            "category",
            "category_name",
            "category_status",

            "description",

            "amount",

            "payment_method",
            "payment_method_display",

            "reference_number",
            "notes",

            "status",
            "status_display",

            "created_at",
            "created_by_name",

            "updated_at",
            "updated_by_name",
        ]

        read_only_fields = [
            "id",

            "category_name",
            "category_status",

            "payment_method_display",

            "status",
            "status_display",

            "created_at",
            "created_by_name",

            "updated_at",
            "updated_by_name",
        ]

    def validate_expense_number(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Expense number is required."
            )

        return value

    def validate_description(self, value):

        return value.strip()

    def validate_amount(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "Expense amount must be greater than zero."
            )

        return value

    def validate_reference_number(self, value):

        return value.strip()

    def validate_category(self, value):

        if (
            value.status
            != ExpenseCategory.Status.ACTIVE
        ):
            raise serializers.ValidationError(
                "Inactive expense categories cannot be used."
            )

        return value

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