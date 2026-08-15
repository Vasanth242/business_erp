from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Payment(models.Model):

    class PaymentType(models.TextChoices):
        CUSTOMER = "CUSTOMER", "Customer Receipt"
        SUPPLIER = "SUPPLIER", "Supplier Payment"

    class PaymentMethod(models.TextChoices):
        CASH = "CASH", "Cash"
        BANK = "BANK", "Bank Transfer"
        UPI = "UPI", "UPI"
        CHEQUE = "CHEQUE", "Cheque"
        OTHER = "OTHER", "Other"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    payment_number = models.CharField(
        max_length=100,
        unique=True,
    )

    payment_type = models.CharField(
        max_length=20,
        choices=PaymentType.choices,
    )

    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="payments",
    )

    supplier = models.ForeignKey(
        "suppliers.Supplier",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="payments",
    )

    payment_date = models.DateField()

    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
    )

    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[
            MinValueValidator(
                Decimal("0.01")
            )
        ],
    )

    reference_number = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )

    notes = models.TextField(
        blank=True,
        default="",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments_created",
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments_updated",
    )

    class Meta:
        ordering = [
            "-payment_date",
            "-id",
        ]

    def __str__(self):
        return (
            f"{self.payment_number} - "
            f"{self.amount}"
        )

class PaymentAllocation(models.Model):

    payment = models.ForeignKey(
        Payment,
        on_delete=models.PROTECT,
        related_name="allocations",
    )

    sale = models.ForeignKey(
        "sales.Sale",
        on_delete=models.PROTECT,
        related_name="payment_allocations",
    )

    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[
            MinValueValidator(
                Decimal("0.01")
            )
        ],
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_allocations_created",
    )

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return (
            f"{self.payment.payment_number} - "
            f"{self.sale.invoice_number} - "
            f"{self.amount}"
        )