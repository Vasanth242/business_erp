from django.contrib import admin

from .models import Expense, ExpenseCategory


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(
    admin.ModelAdmin
):

    list_display = (
        "name",
        "status",
        "created_by",
        "created_at",
        "updated_at",
    )

    list_filter = (
        "status",
    )

    search_fields = (
        "name",
        "description",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    )

    ordering = (
        "name",
    )


@admin.register(Expense)
class ExpenseAdmin(
    admin.ModelAdmin
):

    list_display = (
        "expense_number",
        "expense_date",
        "category",
        "amount",
        "payment_method",
        "status",
        "created_by",
        "created_at",
    )

    list_filter = (
        "status",
        "payment_method",
        "category",
        "expense_date",
    )

    search_fields = (
        "expense_number",
        "category__name",
        "description",
        "reference_number",
        "notes",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    )

    autocomplete_fields = (
        "category",
    )

    ordering = (
        "-expense_date",
        "-id",
    )