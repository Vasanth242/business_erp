from decimal import Decimal
from django.db.models import Count, Prefetch
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from authentication.models import ModulePermission
from authentication.permissions import HasModulePermission, HasModulePermissionOrSalesAccess

from core.models import AuditLog

from payments.models import Payment, PaymentAllocation
from sales.models import Sale
from .models import Customer, Route
from .serializers import CustomerSerializer, RouteSerializer


class RouteViewSet(viewsets.ModelViewSet):

    permission_classes = [
        HasModulePermission,
    ]

    permission_code = (
        ModulePermission.Codes.CUSTOMERS
    )

    def get_permissions(self):

        if self.action in [
            "list",
            "retrieve",
        ]:
            return [
                HasModulePermissionOrSalesAccess()
            ]

        return [
            HasModulePermission()
        ]

    queryset = (
        Route.objects
        .annotate(customer_count=Count("customers"))
        .select_related(
            "created_by",
            "updated_by",
        )
    )

    serializer_class = RouteSerializer

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "code",
        "name",
        "description",
    ]

    ordering_fields = [
        "code",
        "name",
        "created_at",
    ]

    ordering = ["name"]

    def perform_create(self, serializer):

        user = (
            self.request.user
            if self.request.user.is_authenticated
            else None
        )

        route = serializer.save(
            created_by=user,
            updated_by=user,
        )

        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.CREATE,
            model_name="Route",
            object_id=str(route.pk),
            object_repr=str(route),
            changes={
                "created": True,
            },
        )

    def perform_update(self, serializer):

        route = self.get_object()

        old_status = route.status
        old_code = route.code
        old_name = route.name
        old_description = route.description

        user = (
            self.request.user
            if self.request.user.is_authenticated
            else None
        )

        route = serializer.save(
            updated_by=user,
        )

        changes = {}

        old_values = {
            "code": old_code,
            "name": old_name,
            "description": old_description,
            "status": old_status,
        }

        new_values = {
            "code": route.code,
            "name": route.name,
            "description": route.description,
            "status": route.status,
        }

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
                model_name="Route",
                object_id=str(route.pk),
                object_repr=str(route),
                changes=changes,
            )

    def destroy(
        self,
        request,
        *args,
        **kwargs,
    ):

        route = self.get_object()

        if route.customers.exists():

            return Response(
                {
                    "detail":
                        "This route has customers and cannot be deleted."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if route.status == Route.Status.INACTIVE:

            return Response(
                {
                    "detail":
                        "Route is already inactive."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = (
            request.user
            if request.user.is_authenticated
            else None
        )

        route.status = Route.Status.INACTIVE
        route.updated_by = user

        route.save(
            update_fields=[
                "status",
                "updated_by",
                "updated_at",
            ]
        )

        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.DEACTIVATE,
            model_name="Route",
            object_id=str(route.pk),
            object_repr=str(route),
            changes={
                "status": {
                    "old": "ACTIVE",
                    "new": "INACTIVE",
                }
            },
        )

        return Response(
            {
                "detail":
                    "Route deactivated successfully."
            }
        )


class CustomerViewSet(viewsets.ModelViewSet):

    permission_classes = [
        HasModulePermission,
    ]

    permission_code = (
        ModulePermission.Codes.CUSTOMERS
    )

    def get_permissions(self):

        if self.action in [
            "list",
            "retrieve",
        ]:
            return [
                HasModulePermissionOrSalesAccess()
            ]

        return [
            HasModulePermission()
        ]

    queryset = (
        Customer.objects
        .select_related(
            "route",
            "created_by",
            "updated_by",
        )
    )

    serializer_class = CustomerSerializer

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "code",
        "shop_name",
        "contact_person",
        "mobile",
        "address",
        "route__name",
    ]

    ordering_fields = [
        "code",
        "shop_name",
        "created_at",
    ]

    ordering = ["shop_name"]

    def perform_create(self, serializer):

        user = (
            self.request.user
            if self.request.user.is_authenticated
            else None
        )

        customer = serializer.save(
            created_by=user,
            updated_by=user,
        )

        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.CREATE,
            model_name="Customer",
            object_id=str(customer.pk),
            object_repr=str(customer),
            changes={
                "created": True,
            },
        )

    def perform_update(self, serializer):

        customer = self.get_object()

        fields = [
            "code",
            "shop_name",
            "contact_person",
            "mobile",
            "alternate_mobile",
            "address",
            "route_id",
            "customer_type",
            "credit_limit",
            "opening_balance",
            "notes",
            "status",
        ]

        old_values = {}

        for field in fields:
            old_values[field] = str(
                getattr(customer, field)
            )

        user = (
            self.request.user
            if self.request.user.is_authenticated
            else None
        )

        customer = serializer.save(
            updated_by=user,
        )

        changes = {}

        for field in fields:

            new_value = str(
                getattr(customer, field)
            )

            if old_values[field] != new_value:

                changes[field] = {
                    "old": old_values[field],
                    "new": new_value,
                }

        if changes:

            AuditLog.objects.create(
                user=user,
                action=AuditLog.Action.UPDATE,
                model_name="Customer",
                object_id=str(customer.pk),
                object_repr=str(customer),
                changes=changes,
            )

    @action(
        detail=True,
        methods=["get"],
        url_path="outstanding",
    )
    def outstanding(
        self,
        request,
        pk=None,
    ):

        customer = self.get_object()

        # -------------------------------------------------
        # COMPLETED CUSTOMER PAYMENT ALLOCATIONS
        # -------------------------------------------------

        completed_customer_allocations = (
            PaymentAllocation.objects
            .filter(
                payment__status=Payment.Status.COMPLETED,
                payment__payment_type=Payment.PaymentType.CUSTOMER,
            )
            .select_related(
                "payment",
            )
        )

        # -------------------------------------------------
        # COMPLETED SALES FOR THIS CUSTOMER
        # -------------------------------------------------

        sales = (
            Sale.objects
            .filter(
                customer=customer,
                status=Sale.Status.COMPLETED,
            )
            .prefetch_related(
                Prefetch(
                    "payment_allocations",
                    queryset=completed_customer_allocations,
                    to_attr="completed_customer_payment_allocations",
                )
            )
            .order_by(
                "-sale_date",
                "-id",
            )
        )

        invoices = []

        total_sales = Decimal("0.00")
        total_paid = Decimal("0.00")

        # -------------------------------------------------
        # CALCULATE EACH INVOICE
        # -------------------------------------------------

        for sale in sales:

            paid_amount = sum(
                (
                    allocation.amount
                    for allocation in getattr(
                        sale,
                        "completed_customer_payment_allocations",
                        [],
                    )
                ),
                Decimal("0.00"),
            )

            total_amount = sale.total_amount

            # Prevent overpayment from producing
            # a negative outstanding amount.
            if paid_amount > total_amount:
                paid_amount = total_amount

            outstanding_amount = (
                total_amount - paid_amount
            )

            if outstanding_amount < Decimal("0.00"):
                outstanding_amount = Decimal("0.00")

            # -------------------------------------------------
            # PAYMENT STATUS
            # -------------------------------------------------

            if paid_amount == Decimal("0.00"):

                payment_status = "UNPAID"

            elif paid_amount < total_amount:

                payment_status = "PARTIALLY_PAID"

            else:

                payment_status = "PAID"

            invoices.append(
                {
                    "sale_id": sale.id,

                    "invoice_number":
                        sale.invoice_number,

                    "sale_date":
                        sale.sale_date,

                    "total_amount":
                        total_amount,

                    "paid_amount":
                        paid_amount,

                    "outstanding_amount":
                        outstanding_amount,

                    "payment_status":
                        payment_status,
                }
            )

            total_sales += total_amount
            total_paid += paid_amount

        # -------------------------------------------------
        # INVOICE OUTSTANDING
        # -------------------------------------------------

        invoice_outstanding = (
            total_sales - total_paid
        )

        if invoice_outstanding < Decimal("0.00"):
            invoice_outstanding = Decimal("0.00")

        # -------------------------------------------------
        # OPENING BALANCE
        # -------------------------------------------------

        opening_balance = (
            customer.opening_balance
            or Decimal("0.00")
        )

        if opening_balance < Decimal("0.00"):
            opening_balance = Decimal("0.00")

        # -------------------------------------------------
        # TOTAL OUTSTANDING
        # -------------------------------------------------

        total_outstanding = (
            opening_balance
            + invoice_outstanding
        )

        # -------------------------------------------------
        # RESPONSE
        # -------------------------------------------------

        return Response(
            {
                "customer": {
                    "id": customer.id,
                    "code": customer.code,
                    "shop_name": customer.shop_name,
                    "mobile": customer.mobile,
                    "status": customer.status,
                },

                "summary": {
                    "total_sales":
                        total_sales,

                    "total_paid":
                        total_paid,

                    "invoice_outstanding":
                        invoice_outstanding,

                    "opening_balance":
                        opening_balance,

                    "total_outstanding":
                        total_outstanding,
                },

                "invoices": invoices,
            },
            status=status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["get"],
        url_path="payments",
    )
    def payments(
        self,
        request,
        pk=None,
    ):
        customer = self.get_object()

        completed_customer_payments = (
            Payment.objects
            .filter(
                customer=customer,
                payment_type=Payment.PaymentType.CUSTOMER,
                status=Payment.Status.COMPLETED,
            )
            .prefetch_related(
                Prefetch(
                    "allocations",
                    queryset=PaymentAllocation.objects
                    .select_related(
                        "sale",
                    )
                    .order_by("id"),
                    to_attr="customer_payment_allocations",
                )
            )
            .order_by(
                "-payment_date",
                "-id",
            )
        )

        results = []

        total_received = Decimal("0.00")
        total_allocated = Decimal("0.00")
        total_unallocated = Decimal("0.00")

        for payment in completed_customer_payments:

            allocations = getattr(
                payment,
                "customer_payment_allocations",
                [],
            )

            allocated_amount = sum(
                (
                    allocation.amount
                    for allocation in allocations
                ),
                Decimal("0.00"),
            )

            # Prevent incorrect negative unallocated values
            # if an allocation ever exceeds the payment amount.
            if allocated_amount > payment.amount:
                allocated_amount = payment.amount

            unallocated_amount = (
                payment.amount - allocated_amount
            )

            if unallocated_amount < Decimal("0.00"):
                unallocated_amount = Decimal("0.00")

            allocation_data = []

            for allocation in allocations:
                allocation_data.append(
                    {
                        "id": allocation.id,
                        "invoice_number": (
                            allocation.sale.invoice_number
                        ),
                        "sale_id": allocation.sale_id,
                        "amount": allocation.amount,
                    }
                )

            results.append(
                {
                    "payment_id": payment.id,
                    "payment_number": payment.payment_number,
                    "payment_date": payment.payment_date,
                    "payment_method": payment.payment_method,
                    "payment_method_display": (
                        payment.get_payment_method_display()
                    ),
                    "amount": payment.amount,
                    "allocated_amount": allocated_amount,
                    "unallocated_amount": unallocated_amount,
                    "reference_number": (
                        payment.reference_number
                    ),
                    "notes": payment.notes,
                    "allocations": allocation_data,
                }
            )

            total_received += payment.amount
            total_allocated += allocated_amount
            total_unallocated += unallocated_amount

        return Response(
            {
                "customer": {
                    "id": customer.id,
                    "code": customer.code,
                    "shop_name": customer.shop_name,
                    "mobile": customer.mobile,
                    "status": customer.status,
                },
                "summary": {
                    "total_received": total_received,
                    "total_allocated": total_allocated,
                    "total_unallocated": total_unallocated,
                },
                "payments": results,
            },
            status=status.HTTP_200_OK,
        )

    def destroy(
        self,
        request,
        *args,
        **kwargs,
    ):

        customer = self.get_object()

        if customer.status == Customer.Status.INACTIVE:

            return Response(
                {
                    "detail":
                        "Customer is already inactive."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = (
            request.user
            if request.user.is_authenticated
            else None
        )

        customer.status = Customer.Status.INACTIVE
        customer.updated_by = user

        customer.save(
            update_fields=[
                "status",
                "updated_by",
                "updated_at",
            ]
        )

        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.DEACTIVATE,
            model_name="Customer",
            object_id=str(customer.pk),
            object_repr=str(customer),
            changes={
                "status": {
                    "old": "ACTIVE",
                    "new": "INACTIVE",
                }
            },
        )

        return Response(
            {
                "detail":
                    "Customer deactivated successfully."
            }
        )