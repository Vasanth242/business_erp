from rest_framework.routers import DefaultRouter

from .views import (
    StockLocationViewSet,
    StockTransactionViewSet,
    StockBalanceViewSet,
)


router = DefaultRouter()

router.register(
    r"locations",
    StockLocationViewSet,
    basename="stock-location",
)

router.register(
    r"transactions",
    StockTransactionViewSet,
    basename="stock-transaction",
)

router.register(
    r"stock",
    StockBalanceViewSet,
    basename="stock-balance",
)


urlpatterns = router.urls