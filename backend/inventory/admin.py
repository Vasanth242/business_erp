from django.contrib import admin

from .models import StockLocation, StockTransaction


@admin.register(StockLocation)
class StockLocationAdmin(admin.ModelAdmin):

    list_display = (
        "code",
        "name",
        "status",
        "created_by",
        "updated_by",
        "created_at",
        "updated_at",
    )

    list_filter = (
        "status",
    )

    search_fields = (
        "code",
        "name",
        "description",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    )


@admin.register(StockTransaction)
class StockTransactionAdmin(admin.ModelAdmin):

    list_display = (
        "transaction_date",
        "product",
        "location",
        "transaction_type",
        "quantity",
        "reference_number",
        "created_by",
        "created_at",
    )

    list_filter = (
        "transaction_type",
        "location",
        "transaction_date",
    )

    search_fields = (
        "product__name",
        "product__hsn_code",
        "location__name",
        "reference_number",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    )

    ordering = (
        "-transaction_date",
        "-id",
    )