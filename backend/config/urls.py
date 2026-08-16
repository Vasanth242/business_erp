from django.contrib import admin
from django.urls import include, path

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


urlpatterns = [

    path(
        "admin/",
        admin.site.urls,
    ),

    # Products
    path(
        "api/",
        include("products.urls"),
    ),

    # Customers
    path(
        "api/",
        include("customers.urls"),
    ),

    # Inventory
    path(
        "api/inventory/",
        include("inventory.urls"),
    ),

    # Suppliers
    path(
        "api/suppliers/",
        include("suppliers.urls"),
    ),

    # Purchases
    path(
        "api/purchases/",
        include("purchases.urls"),
    ),

    # Sales
    path(
        "api/sales/",
        include("sales.urls"),
    ),

    # Payments
    path(
        "api/payments/",
        include("payments.urls"),
    ),

    # Expenses
    path(
        "api/expenses/",
        include("expenses.urls"),
    ),

    # Dashboard
    path(
        "api/dashboard/",
        include("dashboard.urls"),
    ),

    # Authentication
    path(
        "api/auth/",
        include("authentication.urls"),
    ),

    # JWT
    path(
        "api/auth/token/",
        TokenObtainPairView.as_view(),
        name="token_obtain_pair",
    ),

    path(
        "api/auth/token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),
]