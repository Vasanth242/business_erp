from django.contrib import admin

from .models import Customer, Route


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):

    list_display = [
        "code",
        "name",
        "status",
        "customer_count",
        "created_at",
        "created_by",
        "updated_at",
        "updated_by",
    ]

    search_fields = [
        "code",
        "name",
        "description",
    ]

    list_filter = [
        "status",
    ]

    readonly_fields = [
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    ]

    def customer_count(self, obj):
        return obj.customers.count()

    customer_count.short_description = "Customers"


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):

    list_display = [
        "code",
        "shop_name",
        "contact_person",
        "mobile",
        "route",
        "customer_type",
        "credit_limit",
        "opening_balance",
        "status",
        "created_at",
        "created_by",
        "updated_at",
        "updated_by",
    ]

    search_fields = [
        "code",
        "shop_name",
        "contact_person",
        "mobile",
        "alternate_mobile",
        "address",
    ]

    list_filter = [
        "status",
        "customer_type",
        "route",
    ]

    readonly_fields = [
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    ]