from django.contrib import admin

from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):

    list_display = (
        "hsn_code",
        "name",
        "grade",
        "purchase_rate_per_piece",
        "retail_rate",
        "mrp",
        "status",
    )

    search_fields = (
        "hsn_code",
        "name",
    )

    list_filter = (
        "status",
        "grade",
    )