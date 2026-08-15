import re
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from rest_framework import serializers

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

    for item in history[
        :policy.password_history
    ]:

        if user.check_password(
            password
        ):

            raise serializers.ValidationError(
                {
                    "password":
                        "You cannot reuse one "
                        "of your recent passwords."
                }
            )

        # Check hash directly using Django's
        # password hasher.
        from django.contrib.auth.hashers import (
            check_password,
        )

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
# USER LIST
# ============================================================

class UserListSerializer(
    serializers.ModelSerializer
):

    role = serializers.CharField(
        source="user_profile.role.name",
        read_only=True,
    )

    password_policy = serializers.CharField(
        source=(
            "user_profile.password_policy.name"
        ),
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

            "password_policy",

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