from decimal import Decimal

from django.db import transaction
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from authentication.models import ModulePermission
from authentication.permissions import HasModulePermission

from core.models import AuditLog
from inventory.models import StockTransaction

from .models import Purchase, PurchaseItem
from .serializers import (
    PurchaseItemSerializer,
    PurchaseSerializer,
)


class PurchaseViewSet(
    viewsets.ModelViewSet
):

    permission_classes = [
        HasModulePermission,
    ]

    permission_code = (
        ModulePermission.Codes.PURCHASES
    )

    queryset = (
        Purchase.objects
        .select_related(
            "supplier",
            "location",
            "created_by",
            "updated_by",
        )
        .prefetch_related(
            "items__product",
        )
    )

    serializer_class = PurchaseSerializer

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "invoice_number",
        "supplier__code",
        "supplier__name",
    ]

    ordering_fields = [
        "invoice_number",
        "purchase_date",
        "total_amount",
        "created_at",
    ]

    ordering = [
        "-purchase_date",
        "-id",
    ]

    # ==========================================================
    # HELPERS
    # ==========================================================

    def get_user(self):

        if self.request.user.is_authenticated:
            return self.request.user

        return None

    # ==========================================================
    # CREATE PURCHASE
    # ==========================================================

    @transaction.atomic
    def create(
        self,
        request,
        *args,
        **kwargs,
    ):

        data = request.data.copy()

        items = data.pop(
            "items",
            None,
        )

        if not items:

            return Response(
                {
                    "detail":
                        "At least one purchase item is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(
            data=data
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = self.get_user()

        purchase = serializer.save(
            created_by=user,
            updated_by=user,
        )

        # ------------------------------------------------------
        # Validate purchase items
        # ------------------------------------------------------

        item_serializer = PurchaseItemSerializer(
            data=items,
            many=True,
        )

        item_serializer.is_valid(
            raise_exception=True
        )

        # ------------------------------------------------------
        # Create purchase items
        # ------------------------------------------------------

        subtotal = Decimal("0.00")

        for item_data in item_serializer.validated_data:

            item = PurchaseItem.objects.create(
                purchase=purchase,
                **item_data,
            )

            subtotal += item.amount

        # ------------------------------------------------------
        # Calculate purchase total
        # ------------------------------------------------------

        purchase.subtotal = subtotal

        purchase.total_amount = (
            subtotal
            - purchase.discount
            + purchase.tax
        )

        if purchase.total_amount < Decimal("0.00"):

            return Response(
                {
                    "detail":
                        "Total amount cannot be negative."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        purchase.save(
            update_fields=[
                "subtotal",
                "total_amount",
                "updated_at",
            ]
        )

        # ------------------------------------------------------
        # Audit log
        # ------------------------------------------------------

        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.CREATE,
            model_name="Purchase",
            object_id=str(purchase.pk),
            object_repr=str(purchase),
            changes={
                "created": True,
                "items": len(items),
            },
        )

        output = self.get_serializer(
            purchase
        )

        return Response(
            output.data,
            status=status.HTTP_201_CREATED,
        )

    # ==========================================================
    # UPDATE PURCHASE
    # ==========================================================

    def perform_update(
        self,
        serializer,
    ):

        purchase = self.get_object()

        # ------------------------------------------------------
        # Completed purchases cannot be edited
        # ------------------------------------------------------

        if purchase.status == Purchase.Status.COMPLETED:

            from rest_framework.exceptions import ValidationError

            raise ValidationError({
                "detail":
                    "Completed purchases cannot be edited."
            })

        # ------------------------------------------------------
        # Cancelled purchases cannot be edited
        # ------------------------------------------------------

        if purchase.status == Purchase.Status.CANCELLED:

            from rest_framework.exceptions import ValidationError

            raise ValidationError({
                "detail":
                    "Cancelled purchases cannot be edited."
            })

        user = self.get_user()

        old_values = {
            "invoice_number":
                purchase.invoice_number,

            "supplier_id":
                purchase.supplier_id,

            "purchase_date":
                str(purchase.purchase_date),

            "invoice_date":
                str(purchase.invoice_date),

            "location_id":
                purchase.location_id,

            "status":
                purchase.status,

            "discount":
                str(purchase.discount),

            "tax":
                str(purchase.tax),

            "notes":
                purchase.notes,
        }

        purchase = serializer.save(
            updated_by=user,
        )

        new_values = {
            "invoice_number":
                purchase.invoice_number,

            "supplier_id":
                purchase.supplier_id,

            "purchase_date":
                str(purchase.purchase_date),

            "invoice_date":
                str(purchase.invoice_date),

            "location_id":
                purchase.location_id,

            "status":
                purchase.status,

            "discount":
                str(purchase.discount),

            "tax":
                str(purchase.tax),

            "notes":
                purchase.notes,
        }

        changes = {}

        for field in old_values:

            if old_values[field] != new_values[field]:

                changes[field] = {
                    "old": old_values[field],
                    "new": new_values[field],
                }

        if changes:

            AuditLog.objects.create(
                user=user,
                action=AuditLog.Action.UPDATE,
                model_name="Purchase",
                object_id=str(purchase.pk),
                object_repr=str(purchase),
                changes=changes,
            )

    # ==========================================================
    # COMPLETE PURCHASE
    # ==========================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="complete",
    )
    @transaction.atomic
    def complete(
        self,
        request,
        pk=None,
    ):

        user = self.get_user()

        # ------------------------------------------------------
        # Lock purchase during completion
        # ------------------------------------------------------

        purchase = (
            Purchase.objects
            .select_for_update()
            .select_related(
                "supplier",
                "location",
            )
            .prefetch_related(
                "items__product",
            )
            .get(pk=pk)
        )

        # ------------------------------------------------------
        # Already completed
        # ------------------------------------------------------

        if purchase.status == Purchase.Status.COMPLETED:

            return Response(
                {
                    "detail":
                        "Purchase is already completed."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ------------------------------------------------------
        # Cancelled purchase
        # ------------------------------------------------------

        if purchase.status == Purchase.Status.CANCELLED:

            return Response(
                {
                    "detail":
                        "Cancelled purchase cannot be completed."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ------------------------------------------------------
        # Location must be active
        # ------------------------------------------------------

        if (
            purchase.location.status
            != "ACTIVE"
        ):

            return Response(
                {
                    "detail":
                        "The selected stock location is inactive."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ------------------------------------------------------
        # Purchase must contain items
        # ------------------------------------------------------

        items = list(
            purchase.items.all()
        )

        if not items:

            return Response(
                {
                    "detail":
                        "Cannot complete a purchase without items."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ------------------------------------------------------
        # Create stock transactions
        # ------------------------------------------------------

        for item in items:

            StockTransaction.objects.create(
                product=item.product,
                location=purchase.location,

                transaction_type=(
                    StockTransaction
                    .TransactionType
                    .PURCHASE
                ),

                quantity=item.quantity,

                reference_number=(
                    purchase.invoice_number
                ),

                transaction_date=(
                    purchase.purchase_date
                ),

                notes=(
                    f"Purchase "
                    f"{purchase.invoice_number}"
                ),

                created_by=user,
                updated_by=user,
            )

        # ------------------------------------------------------
        # Change purchase status
        # ------------------------------------------------------

        old_status = purchase.status

        purchase.status = (
            Purchase.Status.COMPLETED
        )

        purchase.updated_by = user

        purchase.save(
            update_fields=[
                "status",
                "updated_by",
                "updated_at",
            ]
        )

        # ------------------------------------------------------
        # Audit log
        # ------------------------------------------------------

        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.UPDATE,
            model_name="Purchase",
            object_id=str(purchase.pk),
            object_repr=str(purchase),
            changes={
                "status": {
                    "old": old_status,
                    "new": (
                        Purchase.Status.COMPLETED
                    ),
                }
            },
        )

        # ------------------------------------------------------
        # Return updated purchase
        # ------------------------------------------------------

        purchase = (
            self.get_queryset()
            .get(pk=purchase.pk)
        )

        output = self.get_serializer(
            purchase
        )

        return Response(
            output.data,
            status=status.HTTP_200_OK,
        )