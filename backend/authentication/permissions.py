from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):

    message = (
        "Administrator access is required."
    )

    def has_permission(
        self,
        request,
        view,
    ):

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

    def has_permission(
        self,
        request,
        view,
    ):

        user = request.user

        if not user or not user.is_authenticated:
            return False

        # Superuser has full access.
        if user.is_superuser:
            return True

        permission_code = getattr(
            view,
            "permission_code",
            None,
        )

        if not permission_code:
            return False

        try:
            profile = user.user_profile
        except Exception:
            return False

        if not profile.role:
            return False

        if not profile.role.is_active:
            return False

        return (
            profile.role.permissions
            .filter(
                code=permission_code,
                is_active=True,
            )
            .exists()
        )