from rest_framework.permissions import BasePermission, SAFE_METHODS

from immobilier.models.enums import RoleEnum


class IsAdminForWritePermission(BasePermission):
    """Autorise la lecture aux utilisateurs authentifiés, écriture réservée Admin."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return True

        user_role = getattr(request.user, 'role', None)
        return bool(request.user.is_superuser or request.user.is_staff or user_role == RoleEnum.ADMIN)
