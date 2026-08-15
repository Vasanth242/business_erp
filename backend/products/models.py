from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from core.models import TimeStampedModel


class Product(TimeStampedModel):

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    hsn_code = models.CharField(
        max_length=50,
        unique=True,
    )

    name = models.CharField(
        max_length=255,
    )

    grade = models.CharField(
        max_length=50,
        blank=True,
        null=True,
    )

    cartons_per_unit = models.PositiveIntegerField(
        default=1,
    )

    boxes_per_carton = models.PositiveIntegerField(
        default=1,
    )

    pieces_per_box = models.PositiveIntegerField(
        default=1,
    )

    purchase_rate_per_piece = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[
            MinValueValidator(Decimal("0.00"))
        ],
    )

    box_purchase_rate = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[
            MinValueValidator(Decimal("0.00"))
        ],
    )

    box_retail_rate = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[
            MinValueValidator(Decimal("0.00"))
        ],
    )

    bill_rate = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[
            MinValueValidator(Decimal("0.00"))
        ],
    )

    retail_rate = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[
            MinValueValidator(Decimal("0.00"))
        ],
    )

    new_retail_rate = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[
            MinValueValidator(Decimal("0.00"))
        ],
    )

    mrp = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[
            MinValueValidator(Decimal("0.00"))
        ],
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.hsn_code} - {self.name}"