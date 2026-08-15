from django.urls import include, path

from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

from .views import (
    LoginView,
    MeView,
    ModulePermissionViewSet,
    PasswordPolicyViewSet,
    RoleViewSet,
    UserViewSet,
)


router = DefaultRouter()

router.register(
    "users",
    UserViewSet,
    basename="authentication-user",
)

router.register(
    "roles",
    RoleViewSet,
    basename="authentication-role",
)

router.register(
    "permissions",
    ModulePermissionViewSet,
    basename="authentication-permission",
)

router.register(
    "password-policies",
    PasswordPolicyViewSet,
    basename="authentication-password-policy",
)


urlpatterns = [

    path(
        "login/",
        LoginView.as_view(),
        name="login",
    ),

    path(
        "me/",
        MeView.as_view(),
        name="me",
    ),

    path(
        "refresh/",
        TokenRefreshView.as_view(),
        name="token-refresh",
    ),

    path(
        "",
        include(router.urls),
    ),
]