from rest_framework.routers import DefaultRouter

from .views import (
    ExpenseCategoryViewSet,
    ExpenseViewSet,
)


router = DefaultRouter()


# IMPORTANT:
# Register categories BEFORE the empty expense route.
router.register(
    r"categories",
    ExpenseCategoryViewSet,
    basename="expense-category",
)


router.register(
    r"",
    ExpenseViewSet,
    basename="expense",
)


urlpatterns = router.urls