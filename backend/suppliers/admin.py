from django.contrib import admin

from .models import Supplier


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):

    list_display = [
        "code",
        "name",
        "contact_person",
        "mobile",
        "gst_number",
        "opening_balance",
        "status",
        "created_at",
        "created_by",
        "updated_at",
        "updated_by",
    ]

    search_fields = [
        "code",
        "name",
        "contact_person",
        "mobile",
        "gst_number",
    ]

    list_filter = [
        "status",
    ]