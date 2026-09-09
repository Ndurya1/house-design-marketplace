from rest_framework import permissions
from users.models import User


class IsSeller(permissions.BasePermission):
    """Grants access only to authenticated seller accounts."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.UserChoices.SELLER
        )


class IsSellerOwnerOrAdmin(permissions.BasePermission):
    """
    Allows sellers to manage their own plans and administrators to manage any
    plan. Public reads are handled by the view queryset, which exposes only
    published records to anonymous users.
    """
    def has_permission(self, request, view):
        # Allow public read operations (GET, HEAD, OPTIONS)
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write operations (POST, PUT, PATCH, DELETE) require authentication
        if not (request.user and request.user.is_authenticated):
            return False

        # Only Admin and Seller roles are authorized to create or modify plans
        return request.user.role in [User.UserChoices.ADMIN, User.UserChoices.SELLER]

    def has_object_permission(self, request, view, obj):
        # Admins can bypass object ownership checks
        if request.user.role == User.UserChoices.ADMIN:
            return True

        # Validate that the plan's seller matches the current user
        return bool(obj.seller and obj.seller.user == request.user)
