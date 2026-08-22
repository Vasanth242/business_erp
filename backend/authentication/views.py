import re
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from rest_framework import (
    filters,
    serializers,
    status,
    viewsets,
)

from rest_framework.decorators import action

from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
    IsAdminUser,
)

from .permissions import HasModulePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import check_password

from core.models import AuditLog

from .models import (
    ModulePermission,
    PasswordHistory,
    PasswordPolicy,
    Role,
    UserProfile,
)

User = get_user_model()


# ============================================================
# PASSWORD VALIDATION
# ============================================================

def validate_password_against_policy(
    password,
    policy,
):

    if not policy:
        return

    errors = []

    if len(password) < policy.min_length:

        errors.append(
            (
                "Password must contain at least "
                f"{policy.min_length} characters."
            )
        )

    if (
        policy.caps_validation
        and not re.search(r"[A-Z]", password)
    ):

        errors.append(
            "Password must contain at least "
            "one uppercase letter."
        )

    if (
        policy.small_validation
        and not re.search(r"[a-z]", password)
    ):

        errors.append(
            "Password must contain at least "
            "one lowercase letter."
        )

    if (
        policy.number_validation
        and not re.search(r"\d", password)
    ):

        errors.append(
            "Password must contain at least "
            "one number."
        )

    if (
        policy.symbol_validation
        and not re.search(
            r"[^A-Za-z0-9]",
            password,
        )
    ):

        errors.append(
            "Password must contain at least "
            "one symbol."
        )

    if policy.consecutive_validation:

        if re.search(
            r"(.)\1",
            password,
        ):

            errors.append(
                "Password cannot contain "
                "consecutive repeated characters."
            )

    if errors:

        raise serializers.ValidationError(
            {
                "password": errors
            }
        )


def validate_password_history(
    user,
    password,
    policy,
):

    if not policy:
        return

    if user.check_password(password):

        raise serializers.ValidationError(
            {
                "password":
                    "You cannot reuse your "
                    "current password."
            }
        )

    if not policy.password_history:
        return

    history = (
        PasswordHistory.objects
        .filter(user=user)
        .order_by("-changed_at")
    )

    for item in history[:policy.password_history]:

        if check_password(
            password,
            item.password_hash,
        ):
            raise serializers.ValidationError(
                {
                    "password":
                        "You cannot reuse one "
                        "of your recent passwords."
                }
            )


# ============================================================
# USER RESPONSE
# ============================================================

def serialize_user(user):

    if user.is_superuser:

        permissions = [
            choice[0]
            for choice
            in ModulePermission.Codes.choices
        ]

        role_name = "Administrator"

    else:

        profile = getattr(
            user,
            "user_profile",
            None,
        )

        role_name = (
            profile.role.name
            if profile
            and profile.role
            else None
        )

        permissions = []

        if (
            profile
            and profile.role
            and profile.role.is_active
        ):

            permissions = list(
                profile.role.permissions
                .filter(
                    is_active=True
                )
                .values_list(
                    "code",
                    flat=True,
                )
            )

    profile = getattr(
        user,
        "user_profile",
        None,
    )

    policy_name = (
        profile.password_policy.name
        if profile
        and profile.password_policy
        else None
    )

    return {

        "id": user.id,

        "username":
            user.username,

        "name":
            user.get_full_name()
            or user.username,

        "email":
            user.email,

        "is_admin":
            user.is_superuser,

        "is_active":
            user.is_active,

        "is_locked":
            (
                profile.is_locked
                if profile
                else False
            ),

        "role":
            role_name,

        "password_policy":
            policy_name,

        "permissions":
            permissions,
    }


# ============================================================
# LOGIN
# ============================================================

class LoginSerializer(
    serializers.Serializer
):

    username = serializers.CharField()

    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate(
        self,
        attrs,
    ):

        username = attrs[
            "username"
        ].strip()

        password = attrs[
            "password"
        ]

        try:

            user = (
                User.objects
                .select_related(
                    "user_profile__role",
                    "user_profile__password_policy",
                )
                .get(
                    username__iexact=username
                )
            )

        except User.DoesNotExist:

            raise serializers.ValidationError(
                {
                    "detail":
                        "Invalid username or password."
                }
            )

        profile = getattr(
            user,
            "user_profile",
            None,
        )

        if not user.is_active:

            raise serializers.ValidationError(
                {
                    "detail":
                        "Your account is disabled. "
                        "Contact an administrator."
                }
            )

        if (
            profile
            and profile.is_locked
        ):

            raise serializers.ValidationError(
                {
                    "detail":
                        "Your account is locked. "
                        "Contact an administrator."
                }
            )

        # ----------------------------------------------------
        # IDLE ACCOUNT CHECK
        # ----------------------------------------------------

        if (
            profile
            and profile.password_policy
            and profile.last_login_at
        ):

            policy = (
                profile.password_policy
            )

            if (
                policy.idle_days
                and (
                    timezone.now()
                    - profile.last_login_at
                )
                > timedelta(
                    days=policy.idle_days
                )
            ):

                profile.is_locked = True

                profile.lock_reason = (
                    UserProfile.LockReason.IDLE
                )

                profile.locked_at = (
                    timezone.now()
                )

                profile.save(
                    update_fields=[
                        "is_locked",
                        "lock_reason",
                        "locked_at",
                        "updated_at",
                    ]
                )

                raise serializers.ValidationError(
                    {
                        "detail":
                            "Your account is locked "
                            "due to inactivity."
                    }
                )

        # ----------------------------------------------------
        # PASSWORD CHECK
        # ----------------------------------------------------

        if not user.check_password(
            password
        ):

            if profile:

                profile.failed_login_attempts += 1

                limit = 5

                if profile.password_policy:

                    limit = (
                        profile
                        .password_policy
                        .disable_count
                    )

                if (
                    profile.failed_login_attempts
                    >= limit
                ):

                    profile.is_locked = True

                    profile.lock_reason = (
                        UserProfile
                        .LockReason
                        .FAILED_ATTEMPTS
                    )

                    profile.locked_at = (
                        timezone.now()
                    )

                profile.save(
                    update_fields=[
                        "failed_login_attempts",
                        "is_locked",
                        "lock_reason",
                        "locked_at",
                        "updated_at",
                    ]
                )

            raise serializers.ValidationError(
                {
                    "detail":
                        "Invalid username or password."
                }
            )

        # ----------------------------------------------------
        # PASSWORD EXPIRY
        # ----------------------------------------------------

        if (
            profile
            and profile.password_policy
            and profile.password_changed_at
        ):

            policy = (
                profile.password_policy
            )

            if (
                policy.expiry_days
                and (
                    timezone.now()
                    - profile.password_changed_at
                )
                > timedelta(
                    days=policy.expiry_days
                )
            ):

                raise serializers.ValidationError(
                    {
                        "detail":
                            "Your password has expired. "
                            "Contact an administrator."
                    }
                )

        attrs["user"] = user

        return attrs

# ============================================================
# LOGIN VIEW
# ============================================================

class LoginView(APIView):

    permission_classes = [
        AllowAny,
    ]

    def post(
        self,
        request,
    ):

        serializer = LoginSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = serializer.validated_data[
            "user"
        ]

        profile = getattr(
            user,
            "user_profile",
            None,
        )

        now = timezone.now()

        if profile:

            profile.failed_login_attempts = 0
            profile.last_login_at = now
            profile.last_activity_at = now

            profile.save(
                update_fields=[
                    "failed_login_attempts",
                    "last_login_at",
                    "last_activity_at",
                    "updated_at",
                ]
            )

        refresh = RefreshToken.for_user(
            user
        )

        return Response(
            {
                "access": str(
                    refresh.access_token
                ),

                "refresh": str(
                    refresh
                ),

                "user": serialize_user(
                    user
                ),
            },

            status=status.HTTP_200_OK,
        )

# ============================================================
# CURRENT USER
# ============================================================

class MeView(APIView):

    def get(
        self,
        request,
    ):

        return Response(
            serialize_user(
                request.user
            ),
            status=status.HTTP_200_OK,
        )

# ============================================================
# USER LIST
# ============================================================

class UserListSerializer(
    serializers.ModelSerializer
):

    role = serializers.PrimaryKeyRelatedField(
        source="user_profile.role",
        read_only=True,
    )

    role_name = serializers.CharField(
        source="user_profile.role.name",
        read_only=True,
    )

    password_policy = serializers.PrimaryKeyRelatedField(
        source="user_profile.password_policy",
        read_only=True,
    )

    password_policy_name = serializers.CharField(
        source="user_profile.password_policy.name",
        read_only=True,
    )

    is_locked = serializers.BooleanField(
        source="user_profile.is_locked",
        read_only=True,
    )

    class Meta:

        model = User

        fields = [

            "id",

            "username",

            "first_name",

            "last_name",

            "email",

            "is_active",

            "is_superuser",

            "role",

            "role_name",

            "password_policy",

            "password_policy_name",

            "is_locked",
        ]


# ============================================================
# CREATE USER
# ============================================================

class UserCreateSerializer(
    serializers.Serializer
):

    username = serializers.CharField(
        max_length=150
    )

    first_name = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
    )

    last_name = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
    )

    email = serializers.EmailField(
        required=False,
        allow_blank=True,
    )

    is_active = serializers.BooleanField(
        default=True
    )

    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    password_confirm = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    role = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.filter(
            is_active=True
        )
    )

    password_policy = serializers.PrimaryKeyRelatedField(
        queryset=PasswordPolicy.objects.filter(
            is_active=True
        )
    )

    def validate_username(
        self,
        value,
    ):

        value = value.strip()

        if not value:

            raise serializers.ValidationError(
                "Username is required."
            )

        if User.objects.filter(
            username__iexact=value
        ).exists():

            raise serializers.ValidationError(
                "Username already exists."
            )

        return value

    def validate(
        self,
        attrs,
    ):

        if (
            attrs["password"]
            != attrs["password_confirm"]
        ):

            raise serializers.ValidationError(
                {
                    "password_confirm":
                        "Passwords do not match."
                }
            )

        validate_password_against_policy(
            attrs["password"],
            attrs["password_policy"],
        )

        return attrs

    @transaction.atomic
    def create(
        self,
        validated_data,
    ):

        validated_data.pop(
            "password_confirm"
        )

        password = validated_data.pop(
            "password"
        )

        role = validated_data.pop(
            "role"
        )

        password_policy = (
            validated_data.pop(
                "password_policy"
            )
        )

        user = User(
            **validated_data
        )

        user.set_password(
            password
        )

        user.save()

        UserProfile.objects.create(
            user=user,
            role=role,
            password_policy=password_policy,
            password_changed_at=timezone.now(),
        )

        return user


# ============================================================
# UPDATE USER
# ============================================================

class UserUpdateSerializer(
    serializers.Serializer
):

    first_name = serializers.CharField(
        max_length=150,
        required=False,
    )

    last_name = serializers.CharField(
        max_length=150,
        required=False,
    )

    email = serializers.EmailField(
        required=False,
        allow_blank=True,
    )

    is_active = serializers.BooleanField(
        required=False
    )

    role = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.filter(
            is_active=True
        ),
        required=False,
    )

    password_policy = serializers.PrimaryKeyRelatedField(
        queryset=PasswordPolicy.objects.filter(
            is_active=True
        ),
        required=False,
    )

    def update(
        self,
        user,
        validated_data,
    ):

        profile = user.user_profile

        for field in [
            "first_name",
            "last_name",
            "email",
            "is_active",
        ]:

            if field in validated_data:

                setattr(
                    user,
                    field,
                    validated_data[field],
                )

        user.save()

        if "role" in validated_data:

            profile.role = (
                validated_data["role"]
            )

        if "password_policy" in validated_data:

            profile.password_policy = (
                validated_data[
                    "password_policy"
                ]
            )

        profile.save()

        return user


# ============================================================
# RESET PASSWORD
# ============================================================

class ResetPasswordSerializer(
    serializers.Serializer
):

    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    password_confirm = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate(
        self,
        attrs,
    ):

        if (
            attrs["password"]
            != attrs["password_confirm"]
        ):

            raise serializers.ValidationError(
                {
                    "password_confirm":
                        "Passwords do not match."
                }
            )

        user = self.context[
            "target_user"
        ]

        policy = (
            user.user_profile.password_policy
        )

        validate_password_against_policy(
            attrs["password"],
            policy,
        )

        validate_password_history(
            user,
            attrs["password"],
            policy,
        )

        return attrs

    @transaction.atomic
    def save(
        self,
        **kwargs,
    ):

        user = self.context[
            "target_user"
        ]

        password = self.validated_data[
            "password"
        ]

        old_hash = user.password

        user.set_password(
            password
        )

        user.save(
            update_fields=[
                "password"
            ]
        )

        PasswordHistory.objects.create(
            user=user,
            password_hash=old_hash,
        )

        profile = user.user_profile

        policy = (
            profile.password_policy
        )

        if policy:

            histories = list(
                PasswordHistory.objects
                .filter(
                    user=user
                )
                .order_by(
                    "-changed_at"
                )
            )

            keep = policy.password_history

            for item in histories[keep:]:

                item.delete()

        profile.password_changed_at = (
            timezone.now()
        )

        profile.failed_login_attempts = 0

        profile.is_locked = False

        profile.locked_at = None

        profile.lock_reason = ""

        profile.save(
            update_fields=[
                "password_changed_at",
                "failed_login_attempts",
                "is_locked",
                "locked_at",
                "lock_reason",
                "updated_at",
            ]
        )

        return user


# ============================================================
# ROLE
# ============================================================

class RoleSerializer(
    serializers.ModelSerializer
):

    permissions = serializers.PrimaryKeyRelatedField(
        queryset=ModulePermission.objects.filter(
            is_active=True
        ),
        many=True,
        required=False,
    )

    class Meta:

        model = Role

        fields = [

            "id",

            "name",

            "description",

            "is_active",

            "permissions",

            "created_at",

            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


# ============================================================
# MODULE PERMISSION
# ============================================================

class ModulePermissionSerializer(
    serializers.ModelSerializer
):

    class Meta:

        model = ModulePermission

        fields = [

            "id",

            "code",

            "name",

            "description",

            "is_active",
        ]


# ============================================================
# PASSWORD POLICY
# ============================================================

class PasswordPolicySerializer(
    serializers.ModelSerializer
):

    class Meta:

        model = PasswordPolicy

        fields = [

            "id",

            "name",

            "disable_count",

            "expiry_days",

            "idle_days",

            "min_length",

            "password_history",

            "session_timeout",

            "caps_validation",

            "small_validation",

            "number_validation",

            "symbol_validation",

            "consecutive_validation",

            "is_active",

            "created_at",

            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate(
        self,
        attrs,
    ):

        if (
            attrs.get(
                "disable_count",
                5,
            )
            < 1
        ):

            raise serializers.ValidationError(
                {
                    "disable_count":
                        "Disable count must be at least 1."
                }
            )

        if (
            attrs.get(
                "min_length",
                8,
            )
            < 1
        ):

            raise serializers.ValidationError(
                {
                    "min_length":
                        "Minimum length must be at least 1."
                }
            )

        if (
            attrs.get(
                "session_timeout",
                30,
            )
            < 1
        ):

            raise serializers.ValidationError(
                {
                    "session_timeout":
                        "Session timeout must be at least 1 minute."
                }
            )

        return attrs

# ============================================================
# USER VIEWSET
# ============================================================


class UserViewSet(viewsets.ModelViewSet):

    permission_code = (
        ModulePermission.Codes.USERS
    )

    queryset = (
        User.objects
        .select_related(
            "user_profile__role",
            "user_profile__password_policy",
        )
        .order_by("username")
    )

    permission_classes = [
        HasModulePermission,
    ]

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "username",
        "first_name",
        "last_name",
        "email",
    ]

    ordering_fields = [
        "username",
        "first_name",
        "last_name",
        "email",
        "date_joined",
    ]

    ordering = [
        "username",
    ]

    def get_serializer_class(self):

        if self.action == "create":
            return UserCreateSerializer

        if self.action in [
            "update",
            "partial_update",
        ]:
            return UserUpdateSerializer

        return UserListSerializer

    def get_queryset(self):

        queryset = super().get_queryset()

        # Administrator can see all users.
        if self.request.user.is_superuser:
            return queryset

        # Normal users can only see themselves.
        return queryset.filter(
            id=self.request.user.id
        )

    def check_admin(self):

        if not self.request.user.is_superuser:

            from rest_framework.exceptions import (
                PermissionDenied,
            )

            raise PermissionDenied(
                "Only administrators can perform this action."
            )

    def list(
        self,
        request,
        *args,
        **kwargs,
    ):

        self.check_admin()

        return super().list(
            request,
            *args,
            **kwargs,
        )

    def retrieve(
        self,
        request,
        *args,
        **kwargs,
    ):

        # Admin can view anybody.
        # Normal user can only retrieve themselves.
        return super().retrieve(
            request,
            *args,
            **kwargs,
        )

    def perform_create(
        self,
        serializer,
    ):

        self.check_admin()

        user = serializer.save()

        AuditLog.objects.create(
            user=self.request.user,
            action=AuditLog.Action.CREATE,
            model_name="User",
            object_id=str(user.pk),
            object_repr=user.username,
            changes={
                "created": True,
            },
        )

    def perform_update(
        self,
        serializer,
    ):

        self.check_admin()

        user = serializer.save()

        AuditLog.objects.create(
            user=self.request.user,
            action=AuditLog.Action.UPDATE,
            model_name="User",
            object_id=str(user.pk),
            object_repr=user.username,
            changes={
                "updated": True,
            },
        )

    def destroy(
        self,
        request,
        *args,
        **kwargs,
    ):

        self.check_admin()

        user = self.get_object()

        if user.is_superuser:

            return Response(
                {
                    "detail":
                        "Administrator accounts cannot be disabled."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_active:

            return Response(
                {
                    "detail":
                        "User is already disabled."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_active = False

        user.save(
            update_fields=[
                "is_active",
            ]
        )

        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.DEACTIVATE,
            model_name="User",
            object_id=str(user.pk),
            object_repr=user.username,
            changes={
                "is_active": {
                    "old": True,
                    "new": False,
                },
            },
        )

        return Response(
            {
                "detail":
                    "User disabled successfully."
            },
            status=status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="enable",
    )
    def enable(
        self,
        request,
        pk=None,
    ):

        self.check_admin()

        user = self.get_object()

        user.is_active = True

        profile = getattr(
            user,
            "user_profile",
            None,
        )

        if profile:

            profile.is_locked = False
            profile.failed_login_attempts = 0
            profile.locked_at = None
            profile.lock_reason = ""

            profile.save(
                update_fields=[
                    "is_locked",
                    "failed_login_attempts",
                    "locked_at",
                    "lock_reason",
                    "updated_at",
                ]
            )

        user.save(
            update_fields=[
                "is_active",
            ]
        )

        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.ACTIVATE,
            model_name="User",
            object_id=str(user.pk),
            object_repr=user.username,
            changes={
                "is_active": True,
                "is_locked": False,
            },
        )

        return Response(
            {
                "detail":
                    "User enabled successfully."
            }
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="unlock",
    )
    def unlock(
        self,
        request,
        pk=None,
    ):

        self.check_admin()

        user = self.get_object()

        profile = getattr(
            user,
            "user_profile",
            None,
        )

        if not profile:

            return Response(
                {
                    "detail":
                        "User profile does not exist."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile.is_locked = False
        profile.failed_login_attempts = 0
        profile.locked_at = None
        profile.lock_reason = ""

        profile.save(
            update_fields=[
                "is_locked",
                "failed_login_attempts",
                "locked_at",
                "lock_reason",
                "updated_at",
            ]
        )

        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.ACTIVATE,
            model_name="User",
            object_id=str(user.pk),
            object_repr=user.username,
            changes={
                "is_locked": False,
                "failed_login_attempts": 0,
            },
        )

        return Response(
            {
                "detail":
                    "User unlocked successfully."
            }
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="reset-password",
    )
    def reset_password(
        self,
        request,
        pk=None,
    ):

        self.check_admin()

        user = self.get_object()

        serializer = ResetPasswordSerializer(
            data=request.data,
            context={
                "target_user": user,
            },
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.UPDATE,
            model_name="User",
            object_id=str(user.pk),
            object_repr=user.username,
            changes={
                "password_reset": True,
            },
        )

        return Response(
            {
                "detail":
                    "Password reset successfully."
            }
        )


# =======================================================Role=====
# ROLE VIEWSET
# ============================================================


class RoleViewSet(viewsets.ModelViewSet):

    queryset = (
        Role.objects
        .prefetch_related(
            "permissions",
        )
        .order_by(
            "name",
        )
    )

    serializer_class = RoleSerializer

    permission_classes = [
        IsAdminUser,
    ]

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "name",
        "description",
    ]

    ordering_fields = [
        "name",
        "created_at",
    ]

    ordering = [
        "name",
    ]

    def check_admin(self):

        if not self.request.user.is_superuser:

            from rest_framework.exceptions import (
                PermissionDenied,
            )

            raise PermissionDenied(
                "Only administrators can manage roles."
            )

    def list(
        self,
        request,
        *args,
        **kwargs,
    ):

        self.check_admin()

        return super().list(
            request,
            *args,
            **kwargs,
        )

    def retrieve(
        self,
        request,
        *args,
        **kwargs,
    ):

        self.check_admin()

        return super().retrieve(
            request,
            *args,
            **kwargs,
        )

    def perform_create(
        self,
        serializer,
    ):

        self.check_admin()

        role = serializer.save()

        AuditLog.objects.create(
            user=self.request.user,
            action=AuditLog.Action.CREATE,
            model_name="Role",
            object_id=str(role.pk),
            object_repr=str(role),
            changes={
                "created": True,
            },
        )

    def perform_update(
        self,
        serializer,
    ):

        self.check_admin()

        role = serializer.save()

        AuditLog.objects.create(
            user=self.request.user,
            action=AuditLog.Action.UPDATE,
            model_name="Role",
            object_id=str(role.pk),
            object_repr=str(role),
            changes={
                "updated": True,
            },
        )

    def destroy(
        self,
        request,
        *args,
        **kwargs,
    ):

        self.check_admin()

        role = self.get_object()

        role.is_active = False

        role.save(
            update_fields=[
                "is_active",
            ]
        )

        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.DEACTIVATE,
            model_name="Role",
            object_id=str(role.pk),
            object_repr=str(role),
            changes={
                "is_active": {
                    "old": True,
                    "new": False,
                },
            },
        )

        return Response(
            {
                "detail":
                    "Role deactivated successfully."
            }
        )


# ============================================================
# MODULE PERMISSION VIEWSET
# ============================================================


class ModulePermissionViewSet(
    viewsets.ModelViewSet
):

    queryset = (
        ModulePermission.objects
        .all()
        .order_by(
            "name",
        )
    )

    serializer_class = (
        ModulePermissionSerializer
    )

    permission_classes = [
        IsAdminUser,
    ]

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "code",
        "name",
        "description",
    ]

    ordering_fields = [
        "code",
        "name",
    ]

    ordering = [
        "name",
    ]

    def check_admin(self):

        if not self.request.user.is_superuser:

            from rest_framework.exceptions import (
                PermissionDenied,
            )

            raise PermissionDenied(
                "Only administrators can manage module permissions."
            )

    def list(
        self,
        request,
        *args,
        **kwargs,
    ):

        self.check_admin()

        return super().list(
            request,
            *args,
            **kwargs,
        )

    def retrieve(
        self,
        request,
        *args,
        **kwargs,
    ):

        self.check_admin()

        return super().retrieve(
            request,
            *args,
            **kwargs,
        )

    def perform_create(
        self,
        serializer,
    ):

        self.check_admin()

        permission = serializer.save()

        AuditLog.objects.create(
            user=self.request.user,
            action=AuditLog.Action.CREATE,
            model_name="ModulePermission",
            object_id=str(permission.pk),
            object_repr=str(permission),
            changes={
                "created": True,
            },
        )

    def perform_update(
        self,
        serializer,
    ):

        self.check_admin()

        permission = serializer.save()

        AuditLog.objects.create(
            user=self.request.user,
            action=AuditLog.Action.UPDATE,
            model_name="ModulePermission",
            object_id=str(permission.pk),
            object_repr=str(permission),
            changes={
                "updated": True,
            },
        )

    def destroy(
        self,
        request,
        *args,
        **kwargs,
    ):

        self.check_admin()

        permission = self.get_object()

        permission.is_active = False

        permission.save(
            update_fields=[
                "is_active",
            ]
        )

        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.DEACTIVATE,
            model_name="ModulePermission",
            object_id=str(permission.pk),
            object_repr=str(permission),
            changes={
                "is_active": {
                    "old": True,
                    "new": False,
                },
            },
        )

        return Response(
            {
                "detail":
                    "Module permission deactivated successfully."
            }
        )


# ============================================================
# PASSWORD POLICY VIEWSET
# ============================================================


class PasswordPolicyViewSet(
    viewsets.ModelViewSet
):

    queryset = (
        PasswordPolicy.objects
        .all()
        .order_by(
            "name",
        )
    )

    serializer_class = (
        PasswordPolicySerializer
    )

    permission_classes = [
        IsAdminUser,
    ]

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "name",
    ]

    ordering_fields = [
        "name",
        "created_at",
    ]

    ordering = [
        "name",
    ]

    def check_admin(self):

        if not self.request.user.is_superuser:

            from rest_framework.exceptions import (
                PermissionDenied,
            )

            raise PermissionDenied(
                "Only administrators can manage password policies."
            )

    def list(
        self,
        request,
        *args,
        **kwargs,
    ):

        self.check_admin()

        return super().list(
            request,
            *args,
            **kwargs,
        )

    def retrieve(
        self,
        request,
        *args,
        **kwargs,
    ):

        self.check_admin()

        return super().retrieve(
            request,
            *args,
            **kwargs,
        )

    def perform_create(
        self,
        serializer,
    ):

        self.check_admin()

        policy = serializer.save()

        AuditLog.objects.create(
            user=self.request.user,
            action=AuditLog.Action.CREATE,
            model_name="PasswordPolicy",
            object_id=str(policy.pk),
            object_repr=str(policy),
            changes={
                "created": True,
            },
        )

    def perform_update(
        self,
        serializer,
    ):

        self.check_admin()

        policy = serializer.save()

        AuditLog.objects.create(
            user=self.request.user,
            action=AuditLog.Action.UPDATE,
            model_name="PasswordPolicy",
            object_id=str(policy.pk),
            object_repr=str(policy),
            changes={
                "updated": True,
            },
        )

    def destroy(
        self,
        request,
        *args,
        **kwargs,
    ):

        self.check_admin()

        policy = self.get_object()

        policy.is_active = False

        policy.save(
            update_fields=[
                "is_active",
            ]
        )

        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.DEACTIVATE,
            model_name="PasswordPolicy",
            object_id=str(policy.pk),
            object_repr=str(policy),
            changes={
                "is_active": {
                    "old": True,
                    "new": False,
                },
            },
        )

        return Response(
            {
                "detail":
                    "Password policy deactivated successfully."
            }
        )