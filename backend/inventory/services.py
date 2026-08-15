from decimal import Decimal

from django.db.models import Sum

from .models import StockTransaction


INCREASE_TYPES = {
    StockTransaction.TransactionType.OPENING,
    StockTransaction.TransactionType.PURCHASE,
    StockTransaction.TransactionType.TRANSFER_IN,
    StockTransaction.TransactionType.RETURN_IN,
    StockTransaction.TransactionType.ADJUSTMENT,
}


DECREASE_TYPES = {
    StockTransaction.TransactionType.SALE,
    StockTransaction.TransactionType.TRANSFER_OUT,
    StockTransaction.TransactionType.RETURN_OUT,
    StockTransaction.TransactionType.DAMAGE,
    StockTransaction.TransactionType.EXPIRY,
}


def get_current_stock(product, location=None):

    transactions = StockTransaction.objects.filter(
        product=product
    )

    if location:
        transactions = transactions.filter(
            location=location
        )

    increase = transactions.filter(
        transaction_type__in=INCREASE_TYPES
    ).aggregate(
        total=Sum("quantity")
    )["total"] or Decimal("0")

    decrease = transactions.filter(
        transaction_type__in=DECREASE_TYPES
    ).aggregate(
        total=Sum("quantity")
    )["total"] or Decimal("0")

    return increase - decrease