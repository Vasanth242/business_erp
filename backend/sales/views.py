from decimal import Decimal

from django.db import transaction

from rest_framework import filters, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from authentication.models import ModulePermission
from authentication.permissions import HasModulePermission

from core.models import AuditLog
from inventory.models import StockTransaction

from .models import Sale, SaleItem
from .serializers import (
    SaleItemSerializer,
    SaleSerializer,
)


class SaleViewSet(viewsets.ModelViewSet):

    permission_classes = [
        HasModulePermission,
    ]

    permission_code = (
        ModulePermission.Codes.SALES
    )

    queryset = (
        Sale.objects
        .select_related(
            "customer",
            "location",
            "created_by",
            "updated_by",
        )
        .prefetch_related(
            "items__product",
        )
    )

    serializer_class = SaleSerializer

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "invoice_number",
        "customer__code",
        "customer__shop_name",
        "customer__mobile",
    ]

    ordering_fields = [
        "invoice_number",
        "sale_date",
        "total_amount",
        "created_at",
    ]

    ordering = [
        "-sale_date",
        "-id",
    ]

    def get_queryset(self):

        queryset = super().get_queryset()

        user = self.request.user

        # Admin / superuser can see all sales
        if not user.is_superuser:
            queryset = queryset.filter(
                created_by=user
        )

        customer = self.request.query_params.get(
            "customer"
        )

        location = self.request.query_params.get(
            "location"
        )

        sale_status = self.request.query_params.get(
            "status"
        )

        if customer:
            queryset = queryset.filter(
                customer_id=customer
            )

        if location:
            queryset = queryset.filter(
                location_id=location
            )

        if sale_status:
            queryset = queryset.filter(
                status=sale_status
            )

        return queryset

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
                        "At least one sale item is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(
            data=data
        )

        serializer.is_valid(
            raise_exception=True
        )

        item_serializer = SaleItemSerializer(
            data=items,
            many=True,
        )

        item_serializer.is_valid(
            raise_exception=True
        )

        user = (
            request.user
            if request.user.is_authenticated
            else None
        )

        sale = serializer.save(
            created_by=user,
            updated_by=user,
        )

        subtotal = Decimal("0.00")

        for item_data in item_serializer.validated_data:

            item = SaleItem.objects.create(
                sale=sale,
                **item_data,
            )

            subtotal += item.amount

        sale.subtotal = subtotal

        sale.total_amount = (
            subtotal
            - sale.discount
            + sale.tax
        )

        if sale.total_amount < Decimal("0.00"):

            raise serializers.ValidationError(
                {
                    "total_amount":
                        "Total amount cannot be negative."
                }
            )

        sale.save(
            update_fields=[
                "subtotal",
                "total_amount",
                "updated_at",
            ]
        )

        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.CREATE,
            model_name="Sale",
            object_id=str(sale.pk),
            object_repr=str(sale),
            changes={
                "created": True,
                "items": len(items),
            },
        )

        output = self.get_serializer(
            sale
        )

        return Response(
            output.data,
            status=status.HTTP_201_CREATED,
        )

    def perform_update(self, serializer):

        sale = self.get_object()

        if sale.status != Sale.Status.DRAFT:

            raise serializers.ValidationError(
                {
                    "detail":
                        "Only draft sales can be edited."
                }
            )

        user = (
            self.request.user
            if self.request.user.is_authenticated
            else None
        )

        sale = serializer.save(
            updated_by=user,
        )

        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.UPDATE,
            model_name="Sale",
            object_id=str(sale.pk),
            object_repr=str(sale),
            changes={
                "updated": True,
            },
        )

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

        sale = self.get_object()

        if sale.status != Sale.Status.DRAFT:

            return Response(
                {
                    "detail":
                        "Only draft sales can be completed."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        items = list(
            sale.items.select_related(
                "product"
            )
        )

        if not items:

            return Response(
                {
                    "detail":
                        "Sale has no items."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = (
            request.user
            if request.user.is_authenticated
            else None
        )

        # -------------------------------------------------
        # CHECK AVAILABLE STOCK FIRST
        # -------------------------------------------------

        for item in items:

            stock_transactions = (
                StockTransaction.objects
                .filter(
                    product=item.product,
                    location=sale.location,
                )
            )

            stock = Decimal("0.00")

            for transaction_obj in stock_transactions:

                quantity = transaction_obj.quantity

                if transaction_obj.transaction_type in [
                    StockTransaction.TransactionType.OPENING,
                    StockTransaction.TransactionType.PURCHASE,
                    StockTransaction.TransactionType.STOCK_IN,
                    StockTransaction.TransactionType.TRANSFER_IN,
                    StockTransaction.TransactionType.ADJUSTMENT_IN,
                ]:
                    stock += quantity

                elif transaction_obj.transaction_type in [
                    StockTransaction.TransactionType.SALE,
                    StockTransaction.TransactionType.STOCK_OUT,
                    StockTransaction.TransactionType.TRANSFER_OUT,
                    StockTransaction.TransactionType.ADJUSTMENT_OUT,
                ]:
                    stock -= quantity

            if item.quantity > stock:

                return Response(
                    {
                        "detail": (
                            f"Insufficient stock for "
                            f"{item.product.name}. "
                            f"Available: {stock}, "
                            f"Requested: {item.quantity}."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # -------------------------------------------------
        # CREATE STOCK TRANSACTIONS
        # -------------------------------------------------

        for item in items:

            StockTransaction.objects.create(
                product=item.product,
                location=sale.location,
                transaction_type=(
                    StockTransaction.TransactionType.SALE
                ),
                quantity=item.quantity,
                reference_number=sale.invoice_number,
                transaction_date=sale.sale_date,
                notes=(
                    f"Sale {sale.invoice_number}"
                ),
                created_by=user,
                updated_by=user,
            )

        # -------------------------------------------------
        # COMPLETE SALE
        # -------------------------------------------------

        sale.status = Sale.Status.COMPLETED
        sale.updated_by = user

        sale.save(
            update_fields=[
                "status",
                "updated_by",
                "updated_at",
            ]
        )

        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.UPDATE,
            model_name="Sale",
            object_id=str(sale.pk),
            object_repr=str(sale),
            changes={
                "status": {
                    "old": "DRAFT",
                    "new": "COMPLETED",
                }
            },
        )

        serializer = self.get_serializer(
            sale
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )