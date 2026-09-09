from rest_framework.permissions import BasePermission


class IsOrderOwnerOrAdmin(BasePermission):
    """Creation is public; every read is authenticated and scoped by the view queryset."""

    def has_permission(self, request, view):
        return view.action == 'create' or bool(request.user and request.user.is_authenticated)
