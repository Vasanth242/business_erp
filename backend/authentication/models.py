from django.conf import settings
from django.db import models


class ModulePermission(models.Model):

    class Codes(models.TextChoices):

        DASHBOARD = (
            "dashboard",
            "Dashboard",
        )

        PRODUCTS = (
            "products",
            "Products",
        )

        CUSTOMERS = (
            "customers",
            "Customers",
        )

        INVENTORY = (
            "inventory",
            "Inventory",
        )

        SUPPLIERS = (
            "suppliers",
            "Suppliers",
        )

        PURCHASES = (
            "purchases",
            "Purchases",
        )

        SALES = (
            "sales",
            "Sales",
        )

        PAYMENTS = (
            "payments",
            "Payments",
        )

        EXPENSES = (
            "expenses",
            "Expenses",
        )

        EXPENSE_CATEGORIES = (
            "expense_categories",
            "Expense Categories",
        )

        FREEZERS = (
            "freezers",
            "Freezers",
        )

        CLAIMS = (
            "claims",
            "Claims",
        )

        RECONCILIATION = (
            "reconciliation",
            "Reconciliation",
        )

        USERS = (
            "users",
            "Users",
        )

        ROLES = (
            "roles",
            "Roles",
        )

        PASSWORD_POLICIES = (
            "password_policies",
            "Password Policies",
        )

        AUDIT_LOGS = (
            "audit_logs",
            "Audit Logs",
        )

    code = models.CharField(
        max_length=50,
        unique=True,
        choices=Codes.choices,
    )

    name = models.CharField(
        max_length=100,
    )

    description = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Role(models.Model):

    name = models.CharField(
        max_length=100,
        unique=True,
    )

    description = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )

    is_active = models.BooleanField(
        default=True,
    )

    permissions = models.ManyToManyField(
        ModulePermission,
        blank=True,
        related_name="roles",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class PasswordPolicy(models.Model):

    name = models.CharField(
        max_length=100,
        unique=True,
    )

    disable_count = models.PositiveIntegerField(
        default=5,
    )

    expiry_days = models.PositiveIntegerField(
        default=90,
    )

    idle_days = models.PositiveIntegerField(
        default=30,
    )

    min_length = models.PositiveIntegerField(
        default=8,
    )

    password_history = models.PositiveIntegerField(
        default=5,
    )

    session_timeout = models.PositiveIntegerField(
        default=30,
    )

    caps_validation = models.BooleanField(
        default=True,
    )

    small_validation = models.BooleanField(
        default=True,
    )

    number_validation = models.BooleanField(
        default=True,
    )

    symbol_validation = models.BooleanField(
        default=True,
    )

    consecutive_validation = models.BooleanField(
        default=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class UserProfile(models.Model):

    class LockReason(models.TextChoices):

        FAILED_ATTEMPTS = (
            "FAILED_ATTEMPTS",
            "Too many failed login attempts",
        )

        IDLE = (
            "IDLE",
            "Inactive for too long",
        )

        ADMIN = (
            "ADMIN",
            "Disabled by administrator",
        )

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_profile",
    )

    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="users",
    )

    password_policy = models.ForeignKey(
        PasswordPolicy,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="users",
    )

    failed_login_attempts = models.PositiveIntegerField(
        default=0,
    )

    last_login_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    last_activity_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    password_changed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    is_locked = models.BooleanField(
        default=False,
    )

    locked_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    lock_reason = models.CharField(
        max_length=30,
        choices=LockReason.choices,
        blank=True,
        default="",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["user__username"]

    def __str__(self):
        return self.user.username


class PasswordHistory(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="password_history",
    )

    password_hash = models.CharField(
        max_length=255,
    )

    changed_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-changed_at"]

    def __str__(self):
        return (
            f"{self.user.username} - "
            f"{self.changed_at:%Y-%m-%d %H:%M}"
        )