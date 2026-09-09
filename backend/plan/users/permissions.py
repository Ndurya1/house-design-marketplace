from rest_framework import permissions
from users.models import User


class IsSuperAdmin(permissions.BasePermission):
    """
    Grants access only to users with the administrator role.
    Uses User.UserChoices.ADMIN to avoid magic string mistakes.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == User.UserChoices.ADMIN
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Grants access if the requesting user is the owner of the object 
    (the user profile itself or has a direct link to user) or an admin.
    """
    def has_object_permission(self, request, view, obj):
        # Prevent unauthenticated requests immediately
        if not (request.user and request.user.is_authenticated):
            return False

        # Admin bypass
        if request.user.role == User.UserChoices.ADMIN:
            return True

        # Check ownership: obj might be SellerProfile (obj.user) or User itself
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return obj == request.user