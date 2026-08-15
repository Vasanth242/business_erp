from rest_framework import serializers

from .models import Supplier


class SupplierSerializer(serializers.ModelSerializer):

    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Supplier

        fields = [
            "id",
            "code",
            "name",
            "contact_person",
            "mobile",
            "alternate_mobile",
            "address",
            "gst_number",
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
                "Supplier code is required."
            )

        return value

    def validate_name(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Supplier name is required."
            )

        return value

    def validate_mobile(self, value):

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

    def validate_opening_balance(self, value):

        if value < 0:
            raise serializers.ValidationError(
                "Opening balance cannot be negative."
            )

        return value