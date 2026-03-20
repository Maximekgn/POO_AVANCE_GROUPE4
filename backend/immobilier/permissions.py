from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminForWritePermission(BasePermission):
    """Autorise la lecture aux utilisateurs authentifiés, écriture réservée Admin."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return True

        return bool(request.user.is_staff or request.user.is_superuser)


class IsBienOwnerOrAdminForWrite(BasePermission):
    """Autorise la lecture aux utilisateurs authentifiés, écriture propriétaire ou admin."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return True

        return bool(request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        if request.user.is_staff or request.user.is_superuser:
            return True

        # Vérifier que l'utilisateur est propriétaire du bien
        return (hasattr(request.user, 'proprietaire_info') and 
                obj.proprietaire_info_id == request.user.proprietaire_info.id)


class IsPhotoBienOwnerOrAdminForWrite(BasePermission):
    """Autorise la lecture aux authentifiés, écriture propriétaire du bien ou admin."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return True

        return bool(request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        if request.user.is_staff or request.user.is_superuser:
            return True

        # Vérifier que l'utilisateur est propriétaire du bien
        return (hasattr(request.user, 'proprietaire_info') and 
                obj.bien.proprietaire_info_id == request.user.proprietaire_info.id)
