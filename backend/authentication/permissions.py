from rest_framework.permissions import BasePermission

from .models import UserProfile


class IsAdminUser(BasePermission):

    message = "Administrator access is required."

    def has_permission(self, request, view):

        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_superuser
        )


class HasModulePermission(BasePermission):

    message = (
        "You do not have permission "
        "to access this module."
    )

    def has_permission(self, request, view):

        user = request.user

        # Not authenticated
        if not user or not user.is_authenticated:
            return False

        # Superuser has complete access
        if user.is_superuser:
            return True

        # Get required module permission
        permission_code = getattr(
            view,
            "permission_code",
            None,
        )

        # View must define a permission
        if not permission_code:
            return False

        # Get user profile
        try:
            profile = user.user_profile
        except UserProfile.DoesNotExist:
            return False

        # User must have a role
        if not profile.role:
            return False

        # Role must be active
        if not profile.role.is_active:
            return False

        # User must be active
        if not user.is_active:
            return False

        # Check module permission
        return (
            profile.role.permissions
            .filter(
                code=permission_code,
                is_active=True,
            )
            .exists()
        )