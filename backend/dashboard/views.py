from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from rest_framework.response import Response
from rest_framework.views import APIView

from customers.models import Customer
from expenses.models import Expense
from inventory.models import StockLocation, StockTransaction
from payments.models import Payment
from products.models import Product
from purchases.models import Purchase
from sales.models import Sale
from suppliers.models import Supplier


ZERO = Decimal("0.00")


def _decimal(value):
    return value if value is not None else ZERO


def _safe_str(value):
    return "" if value is None else str(value)


def _display_name(obj, *fields):
    for field in fields:
        value = getattr(obj, field, None)
        if value:
            return str(value)
    return str(obj)


class DashboardSummaryView(APIView):
    """
    GET /api/dashboard/summary/

    Returns the totals expected by Dashboard.tsx.
    """

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

        sales_total = _decimal(sales_summary["total"])
        sales_count = sales_summary["count"] or 0

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

        purchases_total = _decimal(purchase_summary["total"])
        purchases_count = purchase_summary["count"] or 0

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

        expenses_total = _decimal(expense_summary["total"])
        expenses_count = expense_summary["count"] or 0

        # --------------------------------------------------
        # PAYMENTS
        # --------------------------------------------------
        completed_payments = Payment.objects.filter(
            status=Payment.Status.COMPLETED
        )

        customer_receipts = _decimal(
            completed_payments
            .filter(
                payment_type=Payment.PaymentType.CUSTOMER
            )
            .aggregate(total=Sum("amount"))["total"]
        )

        supplier_payments = _decimal(
            completed_payments
            .filter(
                payment_type=Payment.PaymentType.SUPPLIER
            )
            .aggregate(total=Sum("amount"))["total"]
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

        total_stock = ZERO
        products_in_stock = 0

        for item in inventory:
            stock_in = _decimal(item["stock_in"])
            stock_out = _decimal(item["stock_out"])

            current_stock = stock_in - stock_out
            total_stock += current_stock

            if current_stock > ZERO:
                products_in_stock += 1

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
                    "customer_receipts": customer_receipts,
                    "supplier_payments": supplier_payments,
                },
                "masters": {
                    "active_products": active_products,
                    "active_customers": active_customers,
                    "active_suppliers": active_suppliers,
                    "active_locations": active_locations,
                },
                "inventory": {
                    "total_stock": total_stock,
                    "products_in_stock": products_in_stock,
                },
            }
        )


class DashboardTrendsView(APIView):
    """
    GET /api/dashboard/trends/?period=7d|30d|12m
    """

    def get(self, request):
        period = request.query_params.get("period", "30d")
        today = date.today()

        # --------------------------------------------------
        # DATE RANGE
        # --------------------------------------------------
        if period == "7d":
            start_date = today - timedelta(days=6)

        elif period == "30d":
            start_date = today - timedelta(days=29)

        elif period == "12m":
            month_index = today.year * 12 + (today.month - 1) - 11
            year = month_index // 12
            month = month_index % 12 + 1
            start_date = date(year, month, 1)

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
        # DAILY: 7D / 30D
        # ==================================================
        if period in ("7d", "30d"):
            sales_queryset = (
                Sale.objects
                .filter(
                    status=Sale.Status.COMPLETED,
                    sale_date__gte=start_date,
                    sale_date__lte=today,
                )
                .values("sale_date")
                .annotate(amount=Sum("total_amount"))
            )

            sales_by_date = {
                item["sale_date"]: _decimal(item["amount"])
                for item in sales_queryset
            }

            purchases_queryset = (
                Purchase.objects
                .filter(
                    status=Purchase.Status.COMPLETED,
                    purchase_date__gte=start_date,
                    purchase_date__lte=today,
                )
                .values("purchase_date")
                .annotate(amount=Sum("total_amount"))
            )

            purchases_by_date = {
                item["purchase_date"]: _decimal(item["amount"])
                for item in purchases_queryset
            }

            expenses_queryset = (
                Expense.objects
                .filter(
                    status=Expense.Status.COMPLETED,
                    expense_date__gte=start_date,
                    expense_date__lte=today,
                )
                .values("expense_date")
                .annotate(amount=Sum("amount"))
            )

            expenses_by_date = {
                item["expense_date"]: _decimal(item["amount"])
                for item in expenses_queryset
            }

            dates = []
            current_date = start_date

            while current_date <= today:
                dates.append(current_date)
                current_date += timedelta(days=1)

            sales = [
                {
                    "date": current_date,
                    "amount": sales_by_date.get(
                        current_date,
                        ZERO,
                    ),
                }
                for current_date in dates
            ]

            purchases = [
                {
                    "date": current_date,
                    "amount": purchases_by_date.get(
                        current_date,
                        ZERO,
                    ),
                }
                for current_date in dates
            ]

            expenses = [
                {
                    "date": current_date,
                    "amount": expenses_by_date.get(
                        current_date,
                        ZERO,
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
        # MONTHLY: 12M
        # ==================================================
        sales_queryset = (
            Sale.objects
            .filter(
                status=Sale.Status.COMPLETED,
                sale_date__gte=start_date,
                sale_date__lte=today,
            )
            .annotate(month=TruncMonth("sale_date"))
            .values("month")
            .annotate(amount=Sum("total_amount"))
            .order_by("month")
        )

        sales_by_month = {
            item["month"].date().replace(day=1): _decimal(
                item["amount"]
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
            .annotate(month=TruncMonth("purchase_date"))
            .values("month")
            .annotate(amount=Sum("total_amount"))
            .order_by("month")
        )

        purchases_by_month = {
            item["month"].date().replace(day=1): _decimal(
                item["amount"]
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
            .annotate(month=TruncMonth("expense_date"))
            .values("month")
            .annotate(amount=Sum("amount"))
            .order_by("month")
        )

        expenses_by_month = {
            item["month"].date().replace(day=1): _decimal(
                item["amount"]
            )
            for item in expenses_queryset
        }

        months = []
        current_month = start_date.replace(day=1)
        last_month = today.replace(day=1)

        while current_month <= last_month:
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

        sales = [
            {
                "month": current_month.strftime("%Y-%m"),
                "amount": sales_by_month.get(
                    current_month,
                    ZERO,
                ),
            }
            for current_month in months
        ]

        purchases = [
            {
                "month": current_month.strftime("%Y-%m"),
                "amount": purchases_by_month.get(
                    current_month,
                    ZERO,
                ),
            }
            for current_month in months
        ]

        expenses = [
            {
                "month": current_month.strftime("%Y-%m"),
                "amount": expenses_by_month.get(
                    current_month,
                    ZERO,
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
    """
    GET /api/dashboard/top-products/?limit=5

    Uses completed SALE stock movements to rank products.

    The ERP currently exposes the sold quantity directly through
    StockTransaction. The sales amount is calculated using the
    product's current bill_rate because the available dashboard
    model information does not expose a separate historical sale-line
    model in the supplied backend code.
    """

    def get(self, request):
        try:
            limit = int(request.query_params.get("limit", 5))
        except (TypeError, ValueError):
            limit = 5

        limit = max(1, min(limit, 50))

        sale_type = StockTransaction.TransactionType.SALE

        rows = (
            StockTransaction.objects
            .filter(transaction_type=sale_type)
            .values(
                "product_id",
                "product__name",
                "product__bill_rate",
            )
            .annotate(
                quantity_sold=Sum("quantity")
            )
            .order_by("-quantity_sold")[:limit]
        )

        results = []

        for row in rows:
            quantity = _decimal(row["quantity_sold"])
            bill_rate = _decimal(row["product__bill_rate"])

            results.append(
                {
                    "product_id": row["product_id"],
                    "product_name": row["product__name"],
                    "quantity_sold": quantity,
                    "sales_amount": quantity * bill_rate,
                }
            )

        return Response(
            {
                "limit": limit,
                "results": results,
            }
        )


class DashboardRecentTransactionsView(APIView):
    """
    GET /api/dashboard/recent-transactions/?limit=10

    Combines recent sales, purchases, expenses and payments.
    """

    def get(self, request):
        try:
            limit = int(request.query_params.get("limit", 10))
        except (TypeError, ValueError):
            limit = 10

        limit = max(1, min(limit, 50))

        transactions = []

        # --------------------------------------------------
        # SALES
        # --------------------------------------------------
        sales = (
            Sale.objects
            .filter(status=Sale.Status.COMPLETED)
            .select_related("customer")
            .order_by("-sale_date", "-id")[:limit]
        )

        for sale in sales:
            customer_name = ""

            if getattr(sale, "customer_id", None):
                customer = getattr(sale, "customer", None)
                if customer:
                    customer_name = getattr(
                        customer,
                        "shop_name",
                        "",
                    )

            description = (
                f"Sale to {customer_name}"
                if customer_name
                else "Completed sale"
            )

            transactions.append(
                {
                    "type": "SALE",
                    "id": sale.id,
                    "number": sale.invoice_number,
                    "date": sale.sale_date,
                    "description": description,
                    "amount": sale.total_amount,
                    "status": sale.status,
                }
            )

        # --------------------------------------------------
        # PURCHASES
        # --------------------------------------------------
        purchases = (
            Purchase.objects
            .filter(status=Purchase.Status.COMPLETED)
            .select_related("supplier")
            .order_by("-purchase_date", "-id")[:limit]
        )

        for purchase in purchases:
            supplier_name = ""

            if getattr(purchase, "supplier_id", None):
                supplier = getattr(purchase, "supplier", None)
                if supplier:
                    supplier_name = getattr(
                        supplier,
                        "name",
                        "",
                    )

            description = (
                f"Purchase from {supplier_name}"
                if supplier_name
                else "Completed purchase"
            )

            transactions.append(
                {
                    "type": "PURCHASE",
                    "id": purchase.id,
                    "number": purchase.invoice_number,
                    "date": purchase.purchase_date,
                    "description": description,
                    "amount": purchase.total_amount,
                    "status": purchase.status,
                }
            )

        # --------------------------------------------------
        # EXPENSES
        # --------------------------------------------------
        expenses = (
            Expense.objects
            .filter(status=Expense.Status.COMPLETED)
            .order_by("-expense_date", "-id")[:limit]
        )

        for expense in expenses:
            description = (
                getattr(expense, "description", None)
                or "Business expense"
            )

            transactions.append(
                {
                    "type": "EXPENSE",
                    "id": expense.id,
                    "number": expense.expense_number,
                    "date": expense.expense_date,
                    "description": description,
                    "amount": expense.amount,
                    "status": expense.status,
                }
            )

        # --------------------------------------------------
        # PAYMENTS
        # --------------------------------------------------
        payments = (
            Payment.objects
            .select_related("customer", "supplier")
            .filter(status=Payment.Status.COMPLETED)
            .order_by("-payment_date", "-id")[:limit]
        )

        for payment in payments:
            payment_type = payment.payment_type

            if payment_type == Payment.PaymentType.CUSTOMER:
                transaction_type = "PAYMENT"
                customer = getattr(payment, "customer", None)
                name = (
                    getattr(customer, "shop_name", "")
                    if customer
                    else ""
                )
                description = (
                    f"Customer receipt from {name}"
                    if name
                    else "Customer receipt"
                )

            else:
                transaction_type = "PAYMENT"
                supplier = getattr(payment, "supplier", None)
                name = (
                    getattr(supplier, "name", "")
                    if supplier
                    else ""
                )
                description = (
                    f"Supplier payment to {name}"
                    if name
                    else "Supplier payment"
                )

            transactions.append(
                {
                    "type": transaction_type,
                    "id": payment.id,
                    "number": payment.payment_number,
                    "date": payment.payment_date,
                    "description": description,
                    "amount": payment.amount,
                    "status": payment.status,
                }
            )

        # --------------------------------------------------
        # SORT ALL TRANSACTIONS
        # --------------------------------------------------
        transactions.sort(
            key=lambda item: (
                item["date"] or date.min,
                item["id"],
            ),
            reverse=True,
        )

        return Response(
            {
                "limit": limit,
                "results": transactions[:limit],
            }
        )
