from django.urls import path

from .views import DashboardSummaryView, DashboardTrendsView, DashboardTopProductsView, DashboardRecentTransactionsView


urlpatterns = [
    path(
        "summary/",
        DashboardSummaryView.as_view(),
        name="dashboard-summary",
    ),
    path(
        "trends/",
        DashboardTrendsView.as_view(),
        name="dashboard-trends",
    ),
    path(
        "top-products/",
        DashboardTopProductsView.as_view(),
        name="dashboard-top-products",
    ),
    path(
        "recent-transactions/",
        DashboardRecentTransactionsView.as_view(),
        name="dashboard-recent-transactions",
    ),
]