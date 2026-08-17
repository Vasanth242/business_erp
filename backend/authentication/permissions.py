from rest_framework.permissions import BasePermission

from .models import ModulePermission


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

        if user.is_superuser:
            return True

        permission_code = getattr(
            view,
            "permission_code",
            None,
        )

        if not permission_code:
            return False

        profile = getattr(
            user,
            "user_profile",
            None,
        )

        if not profile:
            return False

        role = profile.role

        if not role or not role.is_active:
            return False

        return role.permissions.filter(
            code=permission_code,
            is_active=True,
        ).exists()


class HasSalesDataAccess(BasePermission):

    message = (
        "You do not have permission "
        "to access sales supporting data."
    )

    def has_permission(
        self,
        request,
        view,
    ):

        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        profile = getattr(
            user,
            "user_profile",
            None,
        )

        if not profile:
            return False

        role = profile.role

        if not role or not role.is_active:
            return False

        return role.permissions.filter(
            code="sales_data_access",
            is_active=True,
        ).exists()

class HasModulePermissionOrSalesAccess(BasePermission):

    message = (
        "You do not have permission "
        "to access this resource."
    )

    def has_permission(
        self,
        request,
        view,
    ):

        user = request.user

        if not user or not user.is_authenticated:
            return False

        # Administrator / superuser
        if user.is_superuser:
            return True

        profile = getattr(
            user,
            "user_profile",
            None,
        )

        if not profile:
            return False

        role = profile.role

        if not role or not role.is_active:
            return False

        permission_code = getattr(
            view,
            "permission_code",
            None,
        )

        # Normal module permission
        if permission_code:
            has_module_permission = (
                role.permissions
                .filter(
                    code=permission_code,
                    is_active=True,
                )
                .exists()
            )

            if has_module_permission:
                return True

        # Sales users may READ supporting data
        if request.method in [
            "GET",
            "HEAD",
            "OPTIONS",
        ]:

            return (
                role.permissions
                .filter(
                    code=ModulePermission.Codes.SALES,
                    is_active=True,
                )
                .exists()
            )

        return False