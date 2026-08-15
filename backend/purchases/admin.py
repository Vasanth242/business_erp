from django.contrib import admin

from .models import Purchase, PurchaseItem


class PurchaseItemInline(admin.TabularInline):

    model = PurchaseItem

    extra = 1

    readonly_fields = [
        "amount",
    ]


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):

    list_display = [
        "invoice_number",
        "supplier",
        "purchase_date",
        "location",
        "subtotal",
        "discount",
        "tax",
        "total_amount",
        "status",
        "created_at",
        "created_by",
        "updated_at",
        "updated_by",
    ]

    search_fields = [
        "invoice_number",
        "supplier__code",
        "supplier__name",
    ]

    list_filter = [
        "status",
        "purchase_date",
        "location",
    ]

    autocomplete_fields = [
        "supplier",
        "location",
    ]

    readonly_fields = [
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    ]

    inlines = [
        PurchaseItemInline,
    ]