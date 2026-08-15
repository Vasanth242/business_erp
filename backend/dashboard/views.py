from datetime import date, timedelta
from decimal import Decimal

from django.db.models import (
    Count,
    Q,
    Sum,
)
from django.db.models.functions import TruncMonth
from rest_framework.response import Response
from rest_framework.views import APIView

from customers.models import Customer
from expenses.models import Expense
from inventory.models import (
    StockLocation,
    StockTransaction,
)
from payments.models import Payment
from products.models import Product
from purchases.models import Purchase
from sales.models import Sale, SaleItem
from suppliers.models import Supplier


class DashboardSummaryView(APIView):

    def get(self, request):

        # --------------------------------------------------
        # SALES
        # --------------------------------------------------

        completed_sales = Sale.objects.filter(
            status=Sale.Status.COMPLETED
        )

        sales_summary = completed_sales.aggregate(
            total=Sum("total_amount"),
            count=Count("id"),
        )

        sales_total = (
            sales_summary["total"]
            or Decimal("0.00")
        )

        sales_count = (
            sales_summary["count"]
            or 0
        )

        # --------------------------------------------------
        # PURCHASES
        # --------------------------------------------------

        completed_purchases = Purchase.objects.filter(
            status=Purchase.Status.COMPLETED
        )

        purchase_summary = completed_purchases.aggregate(
            total=Sum("total_amount"),
            count=Count("id"),
        )

        purchases_total = (
            purchase_summary["total"]
            or Decimal("0.00")
        )

        purchases_count = (
            purchase_summary["count"]
            or 0
        )

        # --------------------------------------------------
        # EXPENSES
        # --------------------------------------------------

        completed_expenses = Expense.objects.filter(
            status=Expense.Status.COMPLETED
        )

        expense_summary = completed_expenses.aggregate(
            total=Sum("amount"),
            count=Count("id"),
        )

        expenses_total = (
            expense_summary["total"]
            or Decimal("0.00")
        )

        expenses_count = (
            expense_summary["count"]
            or 0
        )

        # --------------------------------------------------
        # PAYMENTS
        # --------------------------------------------------

        completed_payments = Payment.objects.filter(
            status=Payment.Status.COMPLETED
        )

        customer_receipts = (
            completed_payments
            .filter(
                payment_type=Payment.PaymentType.CUSTOMER
            )
            .aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )

        supplier_payments = (
            completed_payments
            .filter(
                payment_type=Payment.PaymentType.SUPPLIER
            )
            .aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )

        # --------------------------------------------------
        # MASTER COUNTS
        # --------------------------------------------------

        active_products = Product.objects.filter(
            status=Product.Status.ACTIVE
        ).count()

        active_customers = Customer.objects.filter(
            status=Customer.Status.ACTIVE
        ).count()

        active_suppliers = Supplier.objects.filter(
            status=Supplier.Status.ACTIVE
        ).count()

        active_locations = StockLocation.objects.filter(
            status=StockLocation.Status.ACTIVE
        ).count()

        # --------------------------------------------------
        # INVENTORY
        # --------------------------------------------------

        inventory = (
            StockTransaction.objects
            .values("product_id")
            .annotate(
                stock_in=Sum(
                    "quantity",
                    filter=Q(
                        transaction_type__in=[
                            StockTransaction.TransactionType.OPENING,
                            StockTransaction.TransactionType.PURCHASE,
                            StockTransaction.TransactionType.STOCK_IN,
                            StockTransaction.TransactionType.TRANSFER_IN,
                            StockTransaction.TransactionType.ADJUSTMENT_IN,
                        ]
                    ),
                ),
                stock_out=Sum(
                    "quantity",
                    filter=Q(
                        transaction_type__in=[
                            StockTransaction.TransactionType.SALE,
                            StockTransaction.TransactionType.STOCK_OUT,
                            StockTransaction.TransactionType.TRANSFER_OUT,
                            StockTransaction.TransactionType.ADJUSTMENT_OUT,
                        ]
                    ),
                ),
            )
        )

        total_stock = Decimal("0.00")
        products_in_stock = 0

        for item in inventory:

            stock_in = (
                item["stock_in"]
                or Decimal("0.00")
            )

            stock_out = (
                item["stock_out"]
                or Decimal("0.00")
            )

            current_stock = (
                stock_in - stock_out
            )

            total_stock += current_stock

            if current_stock > 0:
                products_in_stock += 1

        # --------------------------------------------------
        # RESPONSE
        # --------------------------------------------------

        return Response(
            {
                "sales": {
                    "total": sales_total,
                    "count": sales_count,
                },

                "purchases": {
                    "total": purchases_total,
                    "count": purchases_count,
                },

                "expenses": {
                    "total": expenses_total,
                    "count": expenses_count,
                },

                "payments": {
                    "customer_receipts":
                        customer_receipts,

                    "supplier_payments":
                        supplier_payments,
                },

                "masters": {
                    "active_products":
                        active_products,

                    "active_customers":
                        active_customers,

                    "active_suppliers":
                        active_suppliers,

                    "active_locations":
                        active_locations,
                },

                "inventory": {
                    "total_stock":
                        total_stock,

                    "products_in_stock":
                        products_in_stock,
                },
            }
        )

class DashboardTrendsView(APIView):

    def get(self, request):

        period = request.query_params.get(
            "period",
            "30d",
        )

        today = date.today()

        # --------------------------------------------------
        # DATE RANGE
        # --------------------------------------------------

        if period == "7d":

            start_date = (
                today - timedelta(days=6)
            )

        elif period == "30d":

            start_date = (
                today - timedelta(days=29)
            )

        elif period == "12m":

            year = today.year
            month = today.month - 11

            if month <= 0:
                year -= 1
                month += 12

            start_date = date(
                year,
                month,
                1,
            )

        else:

            return Response(
                {
                    "detail": (
                        "Invalid period. "
                        "Use 7d, 30d, or 12m."
                    )
                },
                status=400,
            )

        # ==================================================
        # 7 DAYS / 30 DAYS
        # ==================================================

        if period in ["7d", "30d"]:

            # --------------------------------------------------
            # SALES
            # --------------------------------------------------

            sales_queryset = (
                Sale.objects
                .filter(
                    status=Sale.Status.COMPLETED,
                    sale_date__gte=start_date,
                    sale_date__lte=today,
                )
                .values("sale_date")
                .annotate(
                    amount=Sum("total_amount"),
                )
            )

            sales_by_date = {
                item["sale_date"]: (
                    item["amount"]
                    or Decimal("0.00")
                )
                for item in sales_queryset
            }

            # --------------------------------------------------
            # PURCHASES
            # --------------------------------------------------

            purchases_queryset = (
                Purchase.objects
                .filter(
                    status=Purchase.Status.COMPLETED,
                    purchase_date__gte=start_date,
                    purchase_date__lte=today,
                )
                .values("purchase_date")
                .annotate(
                    amount=Sum("total_amount"),
                )
            )

            purchases_by_date = {
                item["purchase_date"]: (
                    item["amount"]
                    or Decimal("0.00")
                )
                for item in purchases_queryset
            }

            # --------------------------------------------------
            # EXPENSES
            # --------------------------------------------------

            expenses_queryset = (
                Expense.objects
                .filter(
                    status=Expense.Status.COMPLETED,
                    expense_date__gte=start_date,
                    expense_date__lte=today,
                )
                .values("expense_date")
                .annotate(
                    amount=Sum("amount"),
                )
            )

            expenses_by_date = {
                item["expense_date"]: (
                    item["amount"]
                    or Decimal("0.00")
                )
                for item in expenses_queryset
            }

            # --------------------------------------------------
            # COMPLETE DATE RANGE
            # --------------------------------------------------

            dates = []

            current_date = start_date

            while current_date <= today:

                dates.append(current_date)

                current_date += timedelta(days=1)

            # --------------------------------------------------
            # RESPONSE DATA
            # --------------------------------------------------

            sales = [
                {
                    "date": current_date,
                    "amount": sales_by_date.get(
                        current_date,
                        Decimal("0.00"),
                    ),
                }
                for current_date in dates
            ]

            purchases = [
                {
                    "date": current_date,
                    "amount": purchases_by_date.get(
                        current_date,
                        Decimal("0.00"),
                    ),
                }
                for current_date in dates
            ]

            expenses = [
                {
                    "date": current_date,
                    "amount": expenses_by_date.get(
                        current_date,
                        Decimal("0.00"),
                    ),
                }
                for current_date in dates
            ]

            return Response(
                {
                    "period": period,
                    "start_date": start_date,
                    "end_date": today,
                    "sales": sales,
                    "purchases": purchases,
                    "expenses": expenses,
                }
            )

        # ==================================================
        # 12 MONTHS
        # ==================================================

        sales_queryset = (
            Sale.objects
            .filter(
                status=Sale.Status.COMPLETED,
                sale_date__gte=start_date,
                sale_date__lte=today,
            )
            .annotate(
                month=TruncMonth("sale_date"),
            )
            .values("month")
            .annotate(
                amount=Sum("total_amount"),
            )
            .order_by("month")
        )

        sales_by_month = {
            item["month"].replace(day=1): (
                item["amount"]
                or Decimal("0.00")
            )
            for item in sales_queryset
        }

        purchases_queryset = (
            Purchase.objects
            .filter(
                status=Purchase.Status.COMPLETED,
                purchase_date__gte=start_date,
                purchase_date__lte=today,
            )
            .annotate(
                month=TruncMonth("purchase_date"),
            )
            .values("month")
            .annotate(
                amount=Sum("total_amount"),
            )
            .order_by("month")
        )

        purchases_by_month = {
            item["month"].replace(day=1): (
                item["amount"]
                or Decimal("0.00")
            )
            for item in purchases_queryset
        }

        expenses_queryset = (
            Expense.objects
            .filter(
                status=Expense.Status.COMPLETED,
                expense_date__gte=start_date,
                expense_date__lte=today,
            )
            .annotate(
                month=TruncMonth("expense_date"),
            )
            .values("month")
            .annotate(
                amount=Sum("amount"),
            )
            .order_by("month")
        )

        expenses_by_month = {
            item["month"].replace(day=1): (
                item["amount"]
                or Decimal("0.00")
            )
            for item in expenses_queryset
        }

        # --------------------------------------------------
        # COMPLETE 12-MONTH RANGE
        # --------------------------------------------------

        months = []

        current_month = start_date

        while current_month <= today:

            months.append(current_month)

            if current_month.month == 12:

                current_month = date(
                    current_month.year + 1,
                    1,
                    1,
                )

            else:

                current_month = date(
                    current_month.year,
                    current_month.month + 1,
                    1,
                )

        # --------------------------------------------------
        # RESPONSE DATA
        # --------------------------------------------------

        sales = [
            {
                "month": current_month.strftime(
                    "%Y-%m"
                ),
                "amount": sales_by_month.get(
                    current_month,
                    Decimal("0.00"),
                ),
            }
            for current_month in months
        ]

        purchases = [
            {
                "month": current_month.strftime(
                    "%Y-%m"
                ),
                "amount": purchases_by_month.get(
                    current_month,
                    Decimal("0.00"),
                ),
            }
            for current_month in months
        ]

        expenses = [
            {
                "month": current_month.strftime(
                    "%Y-%m"
                ),
                "amount": expenses_by_month.get(
                    current_month,
                    Decimal("0.00"),
                ),
            }
            for current_month in months
        ]

        return Response(
            {
                "period": period,
                "start_date": start_date,
                "end_date": today,
                "sales": sales,
                "purchases": purchases,
                "expenses": expenses,
            }
        )

class DashboardTopProductsView(APIView):

    DEFAULT_LIMIT = 5
    MAX_LIMIT = 50

    def get(self, request):

        # --------------------------------------------------
        # LIMIT
        # --------------------------------------------------

        limit_param = request.query_params.get(
            "limit"
        )

        if limit_param is None:

            limit = self.DEFAULT_LIMIT

        else:

            try:
                limit = int(limit_param)

            except (TypeError, ValueError):

                return Response(
                    {
                        "detail": (
                            "Limit must be a valid integer."
                        )
                    },
                    status=400,
                )

            if limit <= 0:

                return Response(
                    {
                        "detail": (
                            "Limit must be greater than zero."
                        )
                    },
                    status=400,
                )

            if limit > self.MAX_LIMIT:

                return Response(
                    {
                        "detail": (
                            f"Limit cannot exceed "
                            f"{self.MAX_LIMIT}."
                        )
                    },
                    status=400,
                )

        # --------------------------------------------------
        # TOP PRODUCTS
        # --------------------------------------------------

        queryset = (
            SaleItem.objects
            .filter(
                sale__status=Sale.Status.COMPLETED,
            )
            .values(
                "product_id",
                "product__name",
            )
            .annotate(
                quantity_sold=Sum("quantity"),
                sales_amount=Sum("amount"),
            )
            .order_by(
                "-sales_amount",
                "-quantity_sold",
                "product__name",
            )[:limit]
        )

        # --------------------------------------------------
        # RESPONSE
        # --------------------------------------------------

        results = [
            {
                "product_id": item["product_id"],
                "product_name": item["product__name"],
                "quantity_sold": (
                    item["quantity_sold"]
                    or Decimal("0.00")
                ),
                "sales_amount": (
                    item["sales_amount"]
                    or Decimal("0.00")
                ),
            }
            for item in queryset
        ]

        return Response(
            {
                "limit": limit,
                "results": results,
            }
        )

class DashboardRecentTransactionsView(APIView):

    DEFAULT_LIMIT = 10
    MAX_LIMIT = 50

    def get(self, request):

        # --------------------------------------------------
        # LIMIT
        # --------------------------------------------------

        limit_param = request.query_params.get(
            "limit"
        )

        if limit_param is None:

            limit = self.DEFAULT_LIMIT

        else:

            try:
                limit = int(limit_param)

            except (TypeError, ValueError):

                return Response(
                    {
                        "detail": (
                            "Limit must be a valid integer."
                        )
                    },
                    status=400,
                )

            if limit <= 0:

                return Response(
                    {
                        "detail": (
                            "Limit must be greater than zero."
                        )
                    },
                    status=400,
                )

            if limit > self.MAX_LIMIT:

                return Response(
                    {
                        "detail": (
                            f"Limit cannot exceed "
                            f"{self.MAX_LIMIT}."
                        )
                    },
                    status=400,
                )

        # --------------------------------------------------
        # SALES
        # --------------------------------------------------

        sales = (
            Sale.objects
            .select_related("customer")
            .order_by(
                "-sale_date",
                "-id",
            )
        )

        sale_results = [
            {
                "type": "SALE",
                "id": sale.id,
                "number": sale.invoice_number,
                "date": sale.sale_date,
                "description": (
                    sale.customer.shop_name
                    if sale.customer
                    else ""
                ),
                "amount": sale.total_amount,
                "status": sale.status,
            }
            for sale in sales[:limit]
        ]

        # --------------------------------------------------
        # PURCHASES
        # --------------------------------------------------

        purchases = (
            Purchase.objects
            .select_related("supplier")
            .order_by(
                "-purchase_date",
                "-id",
            )
        )

        purchase_results = [
            {
                "type": "PURCHASE",
                "id": purchase.id,
                "number": purchase.invoice_number,
                "date": purchase.purchase_date,
                "description": (
                    purchase.supplier.name
                    if purchase.supplier
                    else ""
                ),
                "amount": purchase.total_amount,
                "status": purchase.status,
            }
            for purchase in purchases[:limit]
        ]

        # --------------------------------------------------
        # EXPENSES
        # --------------------------------------------------

        expenses = (
            Expense.objects
            .select_related("category")
            .order_by(
                "-expense_date",
                "-id",
            )
        )

        expense_results = [
            {
                "type": "EXPENSE",
                "id": expense.id,
                "number": expense.expense_number,
                "date": expense.expense_date,
                "description": expense.category.name,
                "amount": expense.amount,
                "status": expense.status,
            }
            for expense in expenses[:limit]
        ]

        # --------------------------------------------------
        # PAYMENTS
        # --------------------------------------------------

        payments = (
            Payment.objects
            .select_related(
                "customer",
                "supplier",
            )
            .order_by(
                "-payment_date",
                "-id",
            )
        )

        payment_results = []

        for payment in payments[:limit]:

            if (
                payment.payment_type
                == Payment.PaymentType.CUSTOMER
            ):

                description = (
                    payment.customer.shop_name
                    if payment.customer
                    else "Customer Receipt"
                )

            else:

                description = (
                    payment.supplier.name
                    if payment.supplier
                    else "Supplier Payment"
                )

            payment_results.append(
                {
                    "type": "PAYMENT",
                    "id": payment.id,
                    "number": payment.payment_number,
                    "date": payment.payment_date,
                    "description": description,
                    "amount": payment.amount,
                    "status": payment.status,
                }
            )

        # --------------------------------------------------
        # COMBINE
        # --------------------------------------------------

        results = (
            sale_results
            + purchase_results
            + expense_results
            + payment_results
        )

        # --------------------------------------------------
        # SORT
        # --------------------------------------------------

        results.sort(
            key=lambda item: (
                item["date"],
                item["id"],
            ),
            reverse=True,
        )

        # --------------------------------------------------
        # APPLY FINAL LIMIT
        # --------------------------------------------------

        results = results[:limit]

        # --------------------------------------------------
        # RESPONSE
        # --------------------------------------------------

        return Response(
            {
                "limit": limit,
                "results": results,
            }
        )