from django.db.models.deletion import ProtectedError, RestrictedError
from rest_framework import generics
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from immobilier.models import CategorieBien, SousTypeBien
from immobilier.permissions import IsAdminForWritePermission
from immobilier.serializers import CategorieBienSerializer, SousTypeBienSerializer


class CategorieBienListCreateView(generics.ListCreateAPIView):
    queryset = CategorieBien.objects.all().order_by('ordre', 'nom')
    serializer_class = CategorieBienSerializer
    def get_permissions(self):
        # Allow unauthenticated GET, require admin for POST
        if self.request.method == 'GET':
            return []
        return [IsAuthenticated(), IsAdminForWritePermission()]


class CategorieBienDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CategorieBien.objects.all()
    serializer_class = CategorieBienSerializer
    permission_classes = [IsAuthenticated, IsAdminForWritePermission]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        # Règle métier Sprint 2 : suppression impossible si des biens sont liés.
        if instance.biens.exists():
            return Response(
                {'error': 'Suppression impossible: des biens sont lies a cette categorie.'},
                status=status.HTTP_409_CONFLICT,
            )

        try:
            return super().destroy(request, *args, **kwargs)
        except (ProtectedError, RestrictedError):
            return Response(
                {'error': 'Suppression impossible: des biens sont lies a cette categorie.'},
                status=status.HTTP_409_CONFLICT,
            )


class SousTypeBienListCreateView(generics.ListCreateAPIView):
    serializer_class = SousTypeBienSerializer
    permission_classes = [IsAuthenticated, IsAdminForWritePermission]

    def get_queryset(self):
        queryset = SousTypeBien.objects.select_related('categorie').all().order_by('ordre', 'nom')
        categorie_id = self.request.query_params.get('categorie')
        if categorie_id:
            queryset = queryset.filter(categorie_id=categorie_id)
        return queryset


class SousTypeBienDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SousTypeBien.objects.select_related('categorie').all()
    serializer_class = SousTypeBienSerializer
    permission_classes = [IsAuthenticated, IsAdminForWritePermission]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        # Règle métier Sprint 2 : suppression impossible si des biens sont liés.
        if instance.biens.exists():
            return Response(
                {'error': 'Suppression impossible: des biens sont lies a ce sous-type.'},
                status=status.HTTP_409_CONFLICT,
            )

        try:
            return super().destroy(request, *args, **kwargs)
        except (ProtectedError, RestrictedError):
            return Response(
                {'error': 'Suppression impossible: des biens sont lies a ce sous-type.'},
                status=status.HTTP_409_CONFLICT,
            )
