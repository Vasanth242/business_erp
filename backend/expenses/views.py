from django.db import transaction
from django.db.models import Q

from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from authentication.models import ModulePermission
from authentication.permissions import HasModulePermission

from core.models import AuditLog

from .models import Expense, ExpenseCategory
from .serializers import (
    ExpenseSerializer,
    ExpenseCategorySerializer,
)


class ExpenseViewSet(viewsets.ModelViewSet):

    permission_classes = [
        HasModulePermission,
    ]

    permission_code = (
        ModulePermission.Codes.EXPENSES
    )

    queryset = (
        Expense.objects
        .select_related(
            "category",
            "created_by",
            "updated_by",
        )
    )

    serializer_class = ExpenseSerializer

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "expense_number",
        "category__name",
        "description",
        "reference_number",
    ]

    ordering_fields = [
        "expense_number",
        "expense_date",
        "category__name",
        "amount",
        "status",
        "created_at",
    ]

    ordering = [
        "-expense_date",
        "-id",
    ]

    def get_queryset(self):

        queryset = super().get_queryset()

        status_filter = (
            self.request.query_params.get("status")
        )

        category = (
            self.request.query_params.get("category")
        )

        search = (
            self.request.query_params.get("search")
        )

        if status_filter:

            valid_statuses = {
                choice[0]
                for choice in Expense.Status.choices
            }

            if status_filter not in valid_statuses:
                raise ValidationError(
                    {
                        "status": (
                            "Invalid expense status."
                        )
                    }
                )

            queryset = queryset.filter(
                status=status_filter
            )

        if category:

            try:
                category_id = int(category)
            except (TypeError, ValueError):
                raise ValidationError(
                    {
                        "category": (
                            "Category must be a valid ID."
                        )
                    }
                )

            queryset = queryset.filter(
                category_id=category_id
            )

        if search:

            queryset = queryset.filter(
                Q(
                    expense_number__icontains=search
                )
                |
                Q(
                    category__name__icontains=search
                )
                |
                Q(
                    description__icontains=search
                )
                |
                Q(
                    reference_number__icontains=search
                )
            )

        return queryset

    def perform_create(self, serializer):

        user = (
            self.request.user
            if self.request.user.is_authenticated
            else None
        )

        with transaction.atomic():

            expense = serializer.save(
                created_by=user,
                updated_by=user,
            )

            AuditLog.objects.create(
                user=user,
                action=AuditLog.Action.CREATE,
                model_name="Expense",
                object_id=str(expense.pk),
                object_repr=str(expense),
                changes={
                    "created": True,
                },
            )

    def perform_update(self, serializer):

        expense = self.get_object()

        if (
            expense.status
            == Expense.Status.COMPLETED
        ):
            raise ValidationError(
                "Completed expenses cannot be edited."
            )

        if (
            expense.status
            == Expense.Status.CANCELLED
        ):
            raise ValidationError(
                "Cancelled expenses cannot be edited."
            )

        user = (
            self.request.user
            if self.request.user.is_authenticated
            else None
        )

        old_values = {
            "expense_number":
                expense.expense_number,

            "expense_date":
                str(expense.expense_date),

            "category":
                expense.category_id,

            "description":
                expense.description,

            "amount":
                str(expense.amount),

            "payment_method":
                expense.payment_method,

            "reference_number":
                expense.reference_number,

            "notes":
                expense.notes,

            "status":
                expense.status,
        }

        with transaction.atomic():

            expense = serializer.save(
                updated_by=user,
            )

            new_values = {
                "expense_number":
                    expense.expense_number,

                "expense_date":
                    str(expense.expense_date),

                "category":
                    expense.category_id,

                "description":
                    expense.description,

                "amount":
                    str(expense.amount),

                "payment_method":
                    expense.payment_method,

                "reference_number":
                    expense.reference_number,

                "notes":
                    expense.notes,

                "status":
                    expense.status,
            }

            changes = {}

            for field in old_values:

                if (
                    old_values[field]
                    != new_values[field]
                ):

                    changes[field] = {
                        "old": old_values[field],
                        "new": new_values[field],
                    }

            if changes:

                AuditLog.objects.create(
                    user=user,
                    action=AuditLog.Action.UPDATE,
                    model_name="Expense",
                    object_id=str(expense.pk),
                    object_repr=str(expense),
                    changes=changes,
                )

    @action(
        detail=True,
        methods=["post"],
    )
    def complete(
        self,
        request,
        pk=None,
    ):

        with transaction.atomic():

            expense = (
                self.get_queryset()
                .select_for_update()
                .get(pk=pk)
            )

            if (
                expense.status
                == Expense.Status.COMPLETED
            ):
                return Response(
                    {
                        "detail":
                            "Expense is already completed."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if (
                expense.status
                == Expense.Status.CANCELLED
            ):
                return Response(
                    {
                        "detail":
                            "Cancelled expenses cannot be completed."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = (
                request.user
                if request.user.is_authenticated
                else None
            )

            old_status = expense.status

            expense.status = (
                Expense.Status.COMPLETED
            )
            expense.updated_by = user

            expense.save(
                update_fields=[
                    "status",
                    "updated_by",
                    "updated_at",
                ]
            )

            AuditLog.objects.create(
                user=user,
                action=AuditLog.Action.UPDATE,
                model_name="Expense",
                object_id=str(expense.pk),
                object_repr=str(expense),
                changes={
                    "status": {
                        "old": old_status,
                        "new": (
                            Expense.Status.COMPLETED
                        ),
                    }
                },
            )

        expense.refresh_from_db()

        serializer = self.get_serializer(
            expense
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def cancel(
        self,
        request,
        pk=None,
    ):

        with transaction.atomic():

            expense = (
                self.get_queryset()
                .select_for_update()
                .get(pk=pk)
            )

            if (
                expense.status
                == Expense.Status.COMPLETED
            ):
                return Response(
                    {
                        "detail":
                            "Completed expenses cannot be cancelled."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if (
                expense.status
                == Expense.Status.CANCELLED
            ):
                return Response(
                    {
                        "detail":
                            "Expense is already cancelled."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = (
                request.user
                if request.user.is_authenticated
                else None
            )

            old_status = expense.status

            expense.status = (
                Expense.Status.CANCELLED
            )
            expense.updated_by = user

            expense.save(
                update_fields=[
                    "status",
                    "updated_by",
                    "updated_at",
                ]
            )

            AuditLog.objects.create(
                user=user,
                action=AuditLog.Action.UPDATE,
                model_name="Expense",
                object_id=str(expense.pk),
                object_repr=str(expense),
                changes={
                    "status": {
                        "old": old_status,
                        "new": (
                            Expense.Status.CANCELLED
                        ),
                    }
                },
            )

        expense.refresh_from_db()

        serializer = self.get_serializer(
            expense
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


class ExpenseCategoryViewSet(
    viewsets.ModelViewSet
):

    permission_classes = [
        HasModulePermission,
    ]

    permission_code = (
        ModulePermission.Codes.EXPENSES
    )

    queryset = (
        ExpenseCategory.objects
        .select_related(
            "created_by",
            "updated_by",
        )
        .order_by("name")
    )

    serializer_class = (
        ExpenseCategorySerializer
    )

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "name",
        "description",
    ]

    ordering_fields = [
        "name",
        "status",
        "created_at",
    ]

    ordering = [
        "name",
    ]

    def get_queryset(self):

        queryset = super().get_queryset()

        status_filter = (
            self.request.query_params.get(
                "status"
            )
        )

        if status_filter:

            valid_statuses = {
                choice[0]
                for choice
                in ExpenseCategory.Status.choices
            }

            if status_filter not in valid_statuses:
                raise ValidationError(
                    {
                        "status": (
                            "Invalid category status."
                        )
                    }
                )

            queryset = queryset.filter(
                status=status_filter
            )

        return queryset

    def perform_create(self, serializer):

        user = (
            self.request.user
            if self.request.user.is_authenticated
            else None
        )

        with transaction.atomic():

            category = serializer.save(
                created_by=user,
                updated_by=user,
            )

            AuditLog.objects.create(
                user=user,
                action=AuditLog.Action.CREATE,
                model_name="ExpenseCategory",
                object_id=str(category.pk),
                object_repr=str(category),
                changes={
                    "created": True,
                },
            )

    def perform_update(self, serializer):

        category = self.get_object()

        user = (
            self.request.user
            if self.request.user.is_authenticated
            else None
        )

        old_values = {
            "name": category.name,
            "description": category.description,
            "status": category.status,
        }

        with transaction.atomic():

            category = serializer.save(
                updated_by=user,
            )

            new_values = {
                "name": category.name,
                "description": category.description,
                "status": category.status,
            }

            changes = {}

            for field in old_values:

                if (
                    old_values[field]
                    != new_values[field]
                ):

                    changes[field] = {
                        "old": old_values[field],
                        "new": new_values[field],
                    }

            if changes:

                AuditLog.objects.create(
                    user=user,
                    action=AuditLog.Action.UPDATE,
                    model_name="ExpenseCategory",
                    object_id=str(category.pk),
                    object_repr=str(category),
                    changes=changes,
                )

    def destroy(
        self,
        request,
        *args,
        **kwargs,
    ):

        category = self.get_object()

        if category.expenses.exists():

            return Response(
                {
                    "detail":
                        "This expense category cannot be deleted because it is being used by existing expenses. Deactivate it instead."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = (
            request.user
            if request.user.is_authenticated
            else None
        )

        with transaction.atomic():

            response = super().destroy(
                request,
                *args,
                **kwargs,
            )

            AuditLog.objects.create(
                user=user,
                action=AuditLog.Action.DELETE,
                model_name="ExpenseCategory",
                object_id=str(category.pk),
                object_repr=str(category),
                changes={
                    "deleted": True,
                },
            )

        return response