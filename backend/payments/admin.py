from django.db.models import Q
from django.db import transaction

from rest_framework import (
    filters,
    status,
    viewsets,
)
from rest_framework.decorators import action
from rest_framework.response import Response

from core.models import AuditLog

from .models import Payment
from .serializers import PaymentSerializer


class PaymentViewSet(
    viewsets.ModelViewSet
):

    queryset = (
        Payment.objects
        .select_related(
            "customer",
            "supplier",
            "created_by",
            "updated_by",
        )
    )

    serializer_class = PaymentSerializer

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "payment_number",
        "customer__code",
        "customer__shop_name",
        "customer__mobile",
        "supplier__code",
        "supplier__name",
        "reference_number",
    ]

    ordering_fields = [
        "payment_number",
        "payment_date",
        "amount",
        "created_at",
    ]

    ordering = [
        "-payment_date",
        "-id",
    ]

    def get_queryset(self):

        queryset = super().get_queryset()

        payment_type = self.request.query_params.get(
            "payment_type"
        )

        payment_status = self.request.query_params.get(
            "status"
        )

        customer = self.request.query_params.get(
            "customer"
        )

        supplier = self.request.query_params.get(
            "supplier"
        )

        if payment_type:
            queryset = queryset.filter(
                payment_type=payment_type
            )

        if payment_status:
            queryset = queryset.filter(
                status=payment_status
            )

        if customer:
            queryset = queryset.filter(
                customer_id=customer
            )

        if supplier:
            queryset = queryset.filter(
                supplier_id=supplier
            )

        return queryset

    def perform_create(
        self,
        serializer,
    ):

        user = (
            self.request.user
            if self.request.user.is_authenticated
            else None
        )

        payment = serializer.save(
            created_by=user,
            updated_by=user,
        )

        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.CREATE,
            model_name="Payment",
            object_id=str(payment.pk),
            object_repr=str(payment),
            changes={
                "created": True,
            },
        )

    def perform_update(
        self,
        serializer,
    ):

        payment = self.get_object()

        if payment.status != Payment.Status.DRAFT:

            from rest_framework.exceptions import (
                ValidationError,
            )

            raise ValidationError(
                {
                    "detail":
                        "Only draft payments can be edited."
                }
            )

        user = (
            self.request.user
            if self.request.user.is_authenticated
            else None
        )

        payment = serializer.save(
            updated_by=user,
        )

        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.UPDATE,
            model_name="Payment",
            object_id=str(payment.pk),
            object_repr=str(payment),
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

        payment = self.get_object()

        if payment.status != Payment.Status.DRAFT:

            return Response(
                {
                    "detail":
                        "Only draft payments can be completed."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = (
            request.user
            if request.user.is_authenticated
            else None
        )

        payment.status = (
            Payment.Status.COMPLETED
        )

        payment.updated_by = user

        payment.save(
            update_fields=[
                "status",
                "updated_by",
                "updated_at",
            ]
        )

        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.UPDATE,
            model_name="Payment",
            object_id=str(payment.pk),
            object_repr=str(payment),
            changes={
                "status": {
                    "old": "DRAFT",
                    "new": "COMPLETED",
                }
            },
        )

        serializer = self.get_serializer(
            payment
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )