from rest_framework import filters, status, viewsets
from rest_framework.response import Response

from core.models import AuditLog

from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(viewsets.ModelViewSet):

    queryset = Product.objects.all()

    serializer_class = ProductSerializer

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "hsn_code",
        "name",
        "grade",
    ]

    ordering_fields = [
        "name",
        "hsn_code",
        "retail_rate",
        "mrp",
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

        product = serializer.save(
            created_by=user,
            updated_by=user,
        )

        AuditLog.objects.create(
            user=user,

            action=AuditLog.Action.CREATE,

            model_name="Product",

            object_id=str(product.pk),

            object_repr=str(product),

            changes={
                "created": True,
            },
        )

    def perform_update(self, serializer):

        product = self.get_object()

        old_data = {
            field: str(
                getattr(product, field)
            )
            for field in [
                "hsn_code",
                "name",
                "grade",
                "cartons_per_unit",
                "boxes_per_carton",
                "pieces_per_box",
                "purchase_rate_per_piece",
                "box_purchase_rate",
                "box_retail_rate",
                "bill_rate",
                "retail_rate",
                "new_retail_rate",
                "mrp",
                "status",
            ]
        }

        user = (
            self.request.user
            if self.request.user.is_authenticated
            else None
        )

        product = serializer.save(
            updated_by=user,
        )

        new_data = {
            field: str(
                getattr(product, field)
            )
            for field in old_data
        }

        changes = {}

        for field in old_data:

            if old_data[field] != new_data[field]:

                changes[field] = {
                    "old": old_data[field],
                    "new": new_data[field],
                }

        if changes:

            AuditLog.objects.create(
                user=user,

                action=AuditLog.Action.UPDATE,

                model_name="Product",

                object_id=str(product.pk),

                object_repr=str(product),

                changes=changes,
            )

    def destroy(
        self,
        request,
        *args,
        **kwargs,
    ):

        product = self.get_object()

        if (
            product.status ==
            Product.Status.INACTIVE
        ):

            return Response(
                {
                    "detail":
                        "Product is already inactive."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = (
            request.user
            if request.user.is_authenticated
            else None
        )

        product.status = Product.Status.INACTIVE

        product.updated_by = user

        product.save(
            update_fields=[
                "status",
                "updated_by",
                "updated_at",
            ]
        )

        AuditLog.objects.create(
            user=user,

            action=AuditLog.Action.DEACTIVATE,

            model_name="Product",

            object_id=str(product.pk),

            object_repr=str(product),

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
                    "Product deactivated successfully."
            },
            status=status.HTTP_200_OK,
        )