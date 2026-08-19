from django.db import transaction

from rest_framework import (
    filters,
    status,
    viewsets,
)
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from authentication.models import ModulePermission
from authentication.permissions import HasModulePermission

from core.models import AuditLog

from .models import (
    Payment,
    PaymentAllocation,
)
from .serializers import (
    PaymentSerializer,
    PaymentAllocationSerializer,
    PaymentAllocationCreateSerializer,
)


class PaymentViewSet(
    viewsets.ModelViewSet
):

    permission_classes = [
    HasModulePermission,
]

    permission_code = (
        ModulePermission.Codes.PAYMENTS
    )

    queryset = (
        Payment.objects
        .select_related(
            "customer",
            "supplier",
            "created_by",
            "updated_by",
        )
        .prefetch_related(
            "allocations__sale",
            "allocations__created_by",
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

        user = self.request.user

        # Admin / superuser can see all payments
        if not user.is_superuser:
            queryset = queryset.filter(
                created_by=user
            )

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

    # =====================================================
    # CREATE PAYMENT
    # =====================================================

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

    # =====================================================
    # UPDATE PAYMENT
    # =====================================================

    def perform_update(
        self,
        serializer,
    ):

        payment = self.get_object()

        if payment.status != Payment.Status.DRAFT:

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

    # =====================================================
    # DELETE PAYMENT
    # =====================================================

    def perform_destroy(
        self,
        instance,
    ):

        if instance.status != Payment.Status.DRAFT:

            raise ValidationError(
                {
                    "detail":
                        "Only draft payments can be deleted."
                }
            )

        user = (
            self.request.user
            if self.request.user.is_authenticated
            else None
        )

        payment_id = instance.pk
        payment_repr = str(instance)

        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.DELETE,
            model_name="Payment",
            object_id=str(payment_id),
            object_repr=payment_repr,
            changes={
                "deleted": True,
            },
        )

        instance.delete()

    # =====================================================
    # COMPLETE PAYMENT
    # =====================================================

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

        # Lock the payment row.
        payment = (
            self.get_queryset()
            .select_for_update()
            .get(pk=pk)
        )

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

        old_status = payment.status

        payment.status = Payment.Status.COMPLETED
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
                    "old": old_status,
                    "new": Payment.Status.COMPLETED,
                }
            },
        )

        payment = (
            Payment.objects
            .select_related(
                "customer",
                "supplier",
                "created_by",
                "updated_by",
            )
            .prefetch_related(
                "allocations__sale",
                "allocations__created_by",
            )
            .get(pk=payment.pk)
        )

        serializer = self.get_serializer(
            payment
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


# =========================================================
# PAYMENT ALLOCATION VIEWSET
# =========================================================

class PaymentAllocationViewSet(
    viewsets.ModelViewSet
):

    permission_classes = [
    HasModulePermission,
]

    permission_code = (
        ModulePermission.Codes.PAYMENTS
    )

    queryset = (
        PaymentAllocation.objects
        .select_related(
            "payment",
            "payment__customer",
            "payment__supplier",
            "sale",
            "sale__customer",
            "created_by",
        )
    )

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "payment__payment_number",
        "sale__invoice_number",
        "sale__customer__shop_name",
    ]

    ordering_fields = [
        "amount",
        "created_at",
    ]

    ordering = [
        "-created_at",
        "-id",
    ]

    def get_serializer_class(self):

        if self.action == "create":
            return PaymentAllocationCreateSerializer

        return PaymentAllocationSerializer

    # -----------------------------------------------------
    # CREATE ALLOCATION
    # -----------------------------------------------------

    def create(
        self,
        request,
        *args,
        **kwargs,
    ):

        """
        Create a payment allocation safely.

        Payment and Sale rows are locked so that two
        simultaneous requests cannot over-allocate the
        same payment or invoice.
        """

        payment_id = request.data.get(
            "payment"
        )

        sale_id = request.data.get(
            "sale"
        )

        if not payment_id:

            return Response(
                {
                    "payment":
                        "Payment is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not sale_id:

            return Response(
                {
                    "sale":
                        "Sale is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():

            # ---------------------------------------------
            # LOCK PAYMENT
            # ---------------------------------------------

            payment = (
                Payment.objects
                .select_for_update()
                .select_related(
                    "customer",
                )
                .get(
                    pk=payment_id
                )
            )

            # ---------------------------------------------
            # LOCK SALE
            # ---------------------------------------------

            from sales.models import Sale

            sale = (
                Sale.objects
                .select_for_update()
                .select_related(
                    "customer",
                )
                .get(
                    pk=sale_id
                )
            )

            # ---------------------------------------------
            # Run serializer validation AFTER locks
            # ---------------------------------------------

            serializer = (
                PaymentAllocationCreateSerializer(
                    data=request.data,
                    context={
                        "request": request,
                    },
                )
            )

            serializer.is_valid(
                raise_exception=True
            )

            # ---------------------------------------------
            # Make sure serializer resolved the same
            # objects that we locked.
            # ---------------------------------------------

            validated_payment = (
                serializer.validated_data["payment"]
            )

            validated_sale = (
                serializer.validated_data["sale"]
            )

            if validated_payment.pk != payment.pk:

                raise ValidationError(
                    {
                        "payment":
                            "Invalid payment."
                    }
                )

            if validated_sale.pk != sale.pk:

                raise ValidationError(
                    {
                        "sale":
                            "Invalid sale."
                    }
                )

            # ---------------------------------------------
            # CREATE ALLOCATION
            # ---------------------------------------------

            user = (
                request.user
                if request.user.is_authenticated
                else None
            )

            allocation = (
                serializer.save(
                    created_by=user
                )
            )

            # ---------------------------------------------
            # AUDIT LOG
            # ---------------------------------------------

            AuditLog.objects.create(
                user=user,
                action=AuditLog.Action.CREATE,
                model_name="PaymentAllocation",
                object_id=str(
                    allocation.pk
                ),
                object_repr=str(
                    allocation
                ),
                changes={
                    "created": True,
                    "payment": payment.payment_number,
                    "sale": sale.invoice_number,
                    "amount": str(
                        allocation.amount
                    ),
                },
            )

        # ---------------------------------------------
        # Return complete allocation
        # ---------------------------------------------

        allocation = (
            PaymentAllocation.objects
            .select_related(
                "payment",
                "sale",
                "created_by",
            )
            .get(
                pk=allocation.pk
            )
        )

        response_serializer = (
            PaymentAllocationSerializer(
                allocation,
                context={
                    "request": request,
                },
            )
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )

    # -----------------------------------------------------
    # DISABLE UPDATE
    # -----------------------------------------------------

    def update(
        self,
        request,
        *args,
        **kwargs,
    ):

        return Response(
            {
                "detail":
                    (
                        "Payment allocations cannot be edited. "
                        "Create a new allocation instead."
                    )
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # -----------------------------------------------------
    # DISABLE PARTIAL UPDATE
    # -----------------------------------------------------

    def partial_update(
        self,
        request,
        *args,
        **kwargs,
    ):

        return Response(
            {
                "detail":
                    (
                        "Payment allocations cannot be edited. "
                        "Create a new allocation instead."
                    )
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # -----------------------------------------------------
    # DISABLE DELETE
    # -----------------------------------------------------

    def destroy(
        self,
        request,
        *args,
        **kwargs,
    ):

        user = (
            request.user
            if request.user.is_authenticated
            else None
        )

        allocation = self.get_object()

        # ---------------------------------------------
        # Audit the attempted modification
        # ---------------------------------------------

        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.DELETE,
            model_name="PaymentAllocation",
            object_id=str(
                allocation.pk
            ),
            object_repr=str(
                allocation
            ),
            changes={
                "attempted_delete": True,
                "blocked": True,
            },
        )

        return Response(
            {
                "detail":
                    (
                        "Payment allocations cannot be deleted. "
                        "This action has been recorded."
                    )
            },
            status=status.HTTP_403_FORBIDDEN,
        )