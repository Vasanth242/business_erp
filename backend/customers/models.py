from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.conf import settings

from core.models import TimeStampedModel


class Route(TimeStampedModel):

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    code = models.CharField(
        max_length=50,
        unique=True,
    )

    name = models.CharField(
        max_length=150,
    )

    description = models.TextField(
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class Customer(TimeStampedModel):

    class CustomerType(models.TextChoices):
        RETAIL = "RETAIL", "Retail"
        VAN = "VAN", "Van"
        WHOLESALE = "WHOLESALE", "Wholesale"
        COUNTER = "COUNTER", "Counter"
        OTHER = "OTHER", "Other"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    code = models.CharField(
        max_length=50,
        unique=True,
    )

    shop_name = models.CharField(
        max_length=255,
    )

    contact_person = models.CharField(
        max_length=150,
        blank=True,
    )

    mobile = models.CharField(
        max_length=20,
        blank=True,
    )

    alternate_mobile = models.CharField(
        max_length=20,
        blank=True,
    )

    address = models.TextField(
        blank=True,
    )

    route = models.ForeignKey(
        Route,
        on_delete=models.PROTECT,
        related_name="customers",
    )

    customer_type = models.CharField(
        max_length=20,
        choices=CustomerType.choices,
        default=CustomerType.RETAIL,
    )

    credit_limit = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[
            MinValueValidator(Decimal("0.00"))
        ],
    )

    opening_balance = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[
            MinValueValidator(Decimal("0.00"))
        ],
    )

    notes = models.TextField(
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customers_created",
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customers_updated",
    )

    class Meta:
        ordering = ["shop_name"]

    def __str__(self):
        return f"{self.code} - {self.shop_name}"