from django.contrib import admin
from django.urls import include, path

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


urlpatterns = [
    path("admin/", admin.site.urls),

    path(
        "api/",
        include("products.urls"),
    ),

    path(
        "api/",
        include("customers.urls"),
    ),

    path(
        "api/inventory/",
        include("inventory.urls"),
    ),

    path(
    "api/suppliers/",
    include("suppliers.urls"),
    ),

    path(
        "api/purchases/",
        include("purchases.urls"),
    ),

    path(
        "api/sales/",
        include("sales.urls"),
    ),

    path(
        "api/payments/",
        include("payments.urls"),
    ),

    path(
        "api/expenses/",
        include("expenses.urls"),
    ),

    path(
        "api/dashboard/",
        include("dashboard.urls"),
    ),

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