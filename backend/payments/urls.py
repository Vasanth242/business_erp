from rest_framework.routers import DefaultRouter

from .views import (
    PaymentAllocationViewSet,
    PaymentViewSet,
)


router = DefaultRouter()


# IMPORTANT:
# Register allocations BEFORE the empty payment route.
router.register(
    r"allocations",
    PaymentAllocationViewSet,
    basename="payment-allocation",
)


router.register(
    r"",
    PaymentViewSet,
    basename="payment",
)


urlpatterns = router.urls