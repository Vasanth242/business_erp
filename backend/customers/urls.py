from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import (
    CustomerViewSet,
    RouteViewSet,
)


router = DefaultRouter()

router.register(
    "routes",
    RouteViewSet,
    basename="route",
)

router.register(
    "customers",
    CustomerViewSet,
    basename="customer",
)


urlpatterns = [
    path(
        "",
        include(router.urls),
    ),
]