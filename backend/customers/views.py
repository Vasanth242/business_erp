from django.db.models import Count
from rest_framework import filters, status, viewsets
from rest_framework.response import Response

from core.models import AuditLog

from .models import Customer, Route
from .serializers import CustomerSerializer, RouteSerializer


class RouteViewSet(viewsets.ModelViewSet):

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