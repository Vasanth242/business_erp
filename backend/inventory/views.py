from collections import defaultdict
from decimal import Decimal

from django.db.models import Q

from rest_framework import status, viewsets
from rest_framework.response import Response

from authentication.models import ModulePermission
from authentication.permissions import HasModulePermission

from .models import StockLocation, StockTransaction
from .serializers import (
    StockLocationSerializer,
    StockTransactionSerializer,
    StockBalanceSerializer,
)


class StockLocationViewSet(viewsets.ModelViewSet):

    permission_classes = [
        HasModulePermission,
    ]

    permission_code = (
        ModulePermission.Codes.INVENTORY
    )

    queryset = (
        StockLocation.objects
        .select_related(
            "created_by",
            "updated_by",
        )
        .order_by("name")
    )

    serializer_class = StockLocationSerializer

    def get_queryset(self):

        queryset = super().get_queryset()

        search = self.request.query_params.get("search")

        if search:
            queryset = queryset.filter(
                Q(code__icontains=search)
                | Q(name__icontains=search)
                | Q(description__icontains=search)
            )

        return queryset

    def perform_create(self, serializer):

        user = (
            self.request.user
            if self.request.user.is_authenticated
            else None
        )

        serializer.save(
            created_by=user,
            updated_by=user,
        )

    def perform_update(self, serializer):

        user = (
            self.request.user
            if self.request.user.is_authenticated
            else None
        )

        serializer.save(
            updated_by=user,
        )


class StockTransactionViewSet(viewsets.ModelViewSet):

    permission_classes = [
        HasModulePermission,
    ]

    permission_code = (
        ModulePermission.Codes.INVENTORY
    )

    queryset = (
        StockTransaction.objects
        .select_related(
            "product",
            "location",
            "created_by",
            "updated_by",
        )
        .order_by(
            "-transaction_date",
            "-id",
        )
    )

    serializer_class = StockTransactionSerializer

    def get_queryset(self):

        queryset = super().get_queryset()

        product = self.request.query_params.get("product")
        location = self.request.query_params.get("location")
        transaction_type = self.request.query_params.get(
            "transaction_type"
        )
        search = self.request.query_params.get("search")

        if product:
            queryset = queryset.filter(
                product_id=product
            )

        if location:
            queryset = queryset.filter(
                location_id=location
            )

        if transaction_type:
            queryset = queryset.filter(
                transaction_type=transaction_type
            )

        if search:
            queryset = queryset.filter(
                Q(product__name__icontains=search)
                | Q(product__hsn_code__icontains=search)
                | Q(location__name__icontains=search)
                | Q(reference_number__icontains=search)
            )

        return queryset

    def perform_create(self, serializer):

        user = (
            self.request.user
            if self.request.user.is_authenticated
            else None
        )

        serializer.save(
            created_by=user,
            updated_by=user,
        )

    def perform_update(self, serializer):

        user = (
            self.request.user
            if self.request.user.is_authenticated
            else None
        )

        serializer.save(
            updated_by=user,
        )

class StockBalanceViewSet(viewsets.ViewSet):

    permission_classes = [
        HasModulePermission,
    ]

    permission_code = (
        ModulePermission.Codes.INVENTORY
    )

    def list(self, request):

        transactions = (
            StockTransaction.objects
            .select_related(
                "product",
                "location",
            )
        )

        # ======================================================
        # FILTERS
        # ======================================================

        product = request.query_params.get("product")
        location = request.query_params.get("location")
        search = request.query_params.get("search")

        if product:
            transactions = transactions.filter(
                product_id=product
            )

        if location:
            transactions = transactions.filter(
                location_id=location
            )

        if search:
            transactions = transactions.filter(
                Q(product__name__icontains=search)
                | Q(product__hsn_code__icontains=search)
                | Q(location__name__icontains=search)
            )

        # ======================================================
        # GROUP BALANCES
        # ======================================================

        balances = defaultdict(
            lambda: {
                "opening": Decimal("0.00"),
                "purchases": Decimal("0.00"),
                "sales": Decimal("0.00"),
                "stock_in": Decimal("0.00"),
                "stock_out": Decimal("0.00"),
                "adjustment_in": Decimal("0.00"),
                "adjustment_out": Decimal("0.00"),
            }
        )

        objects = {}

        # ======================================================
        # PROCESS TRANSACTIONS
        # ======================================================

        for transaction in transactions:

            key = (
                transaction.product_id,
                transaction.location_id,
            )

            objects[key] = transaction

            quantity = transaction.quantity

            transaction_type = (
                transaction.transaction_type
            )

            if transaction_type == (
                StockTransaction
                .TransactionType
                .OPENING
            ):

                balances[key]["opening"] += quantity

            elif transaction_type == (
                StockTransaction
                .TransactionType
                .PURCHASE
            ):

                balances[key]["purchases"] += quantity

            elif transaction_type == (
                StockTransaction
                .TransactionType
                .SALE
            ):

                balances[key]["sales"] += quantity

            elif transaction_type == (
                StockTransaction
                .TransactionType
                .STOCK_IN
            ):

                balances[key]["stock_in"] += quantity

            elif transaction_type == (
                StockTransaction
                .TransactionType
                .STOCK_OUT
            ):

                balances[key]["stock_out"] += quantity

            elif transaction_type == (
                StockTransaction
                .TransactionType
                .TRANSFER_IN
            ):

                balances[key]["stock_in"] += quantity

            elif transaction_type == (
                StockTransaction
                .TransactionType
                .TRANSFER_OUT
            ):

                balances[key]["stock_out"] += quantity

            elif transaction_type == (
                StockTransaction
                .TransactionType
                .ADJUSTMENT_IN
            ):

                balances[key]["adjustment_in"] += quantity

            elif transaction_type == (
                StockTransaction
                .TransactionType
                .ADJUSTMENT_OUT
            ):

                balances[key]["adjustment_out"] += quantity

        # ======================================================
        # BUILD RESULTS
        # ======================================================

        results = []

        for key, values in balances.items():

            transaction = objects[key]

            current_stock = (
                values["opening"]
                + values["purchases"]
                + values["stock_in"]
                + values["adjustment_in"]
                - values["sales"]
                - values["stock_out"]
                - values["adjustment_out"]
            )

            results.append(
                {
                    "product":
                        transaction.product_id,

                    "product_name":
                        transaction.product.name,

                    "product_hsn":
                        transaction.product.hsn_code,

                    "location":
                        transaction.location_id,

                    "location_name":
                        transaction.location.name,

                    "opening":
                        values["opening"],

                    "purchases":
                        values["purchases"],

                    "sales":
                        values["sales"],

                    "stock_in":
                        values["stock_in"],

                    "stock_out":
                        values["stock_out"],

                    "adjustment_in":
                        values["adjustment_in"],

                    "adjustment_out":
                        values["adjustment_out"],

                    "current_stock":
                        current_stock,
                }
            )

        # ======================================================
        # SORT
        # ======================================================

        results.sort(
            key=lambda item: (
                item["product_name"].lower(),
                item["location_name"].lower(),
            )
        )

        # ======================================================
        # SERIALIZE
        # ======================================================

        serializer = StockBalanceSerializer(
            results,
            many=True,
        )

        return Response(
            {
                "count": len(results),
                "next": None,
                "previous": None,
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )