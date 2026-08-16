from rest_framework import filters, status, viewsets
from rest_framework.response import Response

from authentication.models import ModulePermission
from authentication.permissions import HasModulePermission

from core.models import AuditLog

from .models import Supplier
from .serializers import SupplierSerializer


class SupplierViewSet(viewsets.ModelViewSet):

    permission_classes = [
        HasModulePermission,
    ]

    permission_code = (
        ModulePermission.Codes.SUPPLIERS
    )

    queryset = (
        Supplier.objects
        .select_related(
            "created_by",
            "updated_by",
        )
    )

    serializer_class = SupplierSerializer

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "code",
        "name",
        "contact_person",
        "mobile",
        "gst_number",
    ]

    ordering_fields = [
        "code",
        "name",
        "created_at",
    ]

    ordering = [
        "name",
    ]

    def perform_create(self, serializer):

        user = (
            self.request.user
            if self.request.user.is_authenticated
            else None
        )

        supplier = serializer.save(
            created_by=user,
            updated_by=user,
        )

        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.CREATE,
            model_name="Supplier",
            object_id=str(supplier.pk),
            object_repr=str(supplier),
            changes={
                "created": True,
            },
        )

    def perform_update(self, serializer):

        supplier = self.get_object()

        fields = [
            "code",
            "name",
            "contact_person",
            "mobile",
            "alternate_mobile",
            "address",
            "gst_number",
            "opening_balance",
            "notes",
            "status",
        ]

        old_values = {
            field: str(
                getattr(supplier, field)
            )
            for field in fields
        }

        user = (
            self.request.user
            if self.request.user.is_authenticated
            else None
        )

        supplier = serializer.save(
            updated_by=user,
        )

        changes = {}

        for field in fields:

            new_value = str(
                getattr(supplier, field)
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
                model_name="Supplier",
                object_id=str(supplier.pk),
                object_repr=str(supplier),
                changes=changes,
            )

    def destroy(
        self,
        request,
        *args,
        **kwargs,
    ):

        supplier = self.get_object()

        if supplier.status == Supplier.Status.INACTIVE:

            return Response(
                {
                    "detail":
                        "Supplier is already inactive."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = (
            request.user
            if request.user.is_authenticated
            else None
        )

        supplier.status = Supplier.Status.INACTIVE
        supplier.updated_by = user

        supplier.save(
            update_fields=[
                "status",
                "updated_by",
                "updated_at",
            ]
        )

        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.DEACTIVATE,
            model_name="Supplier",
            object_id=str(supplier.pk),
            object_repr=str(supplier),
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
                    "Supplier deactivated successfully."
            }
        )