from django.db import transaction

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError

from immobilier.models import Bien, Photo
from immobilier.permissions import IsPhotoBienOwnerOrAdminForWrite
from immobilier.serializers import PhotoSerializer, BienPhotoReorderSerializer


class BienPhotoListCreateView(generics.ListCreateAPIView):
    serializer_class = PhotoSerializer
    permission_classes = [IsAuthenticated, IsPhotoBienOwnerOrAdminForWrite]

    def get_queryset(self):
        return Photo.objects.filter(bien_id=self.kwargs['bien_id']).order_by('ordre', 'id')

    def perform_create(self, serializer):
        bien = Bien.objects.get(pk=self.kwargs['bien_id'])
        user = self.request.user

        is_admin = user.isAdmin()
        is_owner = (hasattr(user, 'proprietaire_info') and 
                    bien.proprietaire_info_id == user.proprietaire_info.id)

        if not (is_admin or is_owner):
            raise PermissionDenied('Vous ne pouvez pas ajouter des photos a ce bien.')

        if serializer.validated_data.get('principale', False):
            Photo.objects.filter(bien_id=bien.id, principale=True).update(principale=False)

        serializer.save(bien=bien)


class PhotoDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Photo.objects.select_related('bien').all()
    serializer_class = PhotoSerializer
    permission_classes = [IsAuthenticated, IsPhotoBienOwnerOrAdminForWrite]

    def perform_update(self, serializer):
        photo = self.get_object()
        if serializer.validated_data.get('principale', False):
            Photo.objects.filter(bien_id=photo.bien_id, principale=True).exclude(id=photo.id).update(principale=False)

        serializer.save()


class BienPhotoReorderView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, bien_id):
        bien = Bien.objects.get(pk=bien_id)

        user = request.user
        is_admin = user.is_superuser or user.is_staff
        is_owner = (hasattr(user, 'proprietaire_info') and bien.proprietaire_info_id == user.proprietaire_info.id)

        if not (is_admin or is_owner):
            raise PermissionDenied('Vous ne pouvez pas reordonner les photos de ce bien.')

        serializer = BienPhotoReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        items = serializer.validated_data['photos']
        if not items:
            raise ValidationError({'photos': 'La liste des photos ne peut pas etre vide.'})

        photo_ids = [item['id'] for item in items]
        ordres = [item['ordre'] for item in items]

        if len(photo_ids) != len(set(photo_ids)):
            raise ValidationError({'photos': 'Les identifiants de photo doivent etre uniques.'})

        if len(ordres) != len(set(ordres)):
            raise ValidationError({'photos': 'Les ordres doivent etre uniques.'})

        photos = Photo.objects.filter(id__in=photo_ids, bien_id=bien.id)
        if photos.count() != len(photo_ids):
            raise ValidationError({'photos': 'Toutes les photos doivent appartenir au bien cible.'})

        mapping = {item['id']: item['ordre'] for item in items}

        with transaction.atomic():
            for photo in photos:
                photo.ordre = mapping[photo.id]
                photo.save(update_fields=['ordre'])

        updated = Photo.objects.filter(bien_id=bien.id).order_by('ordre', 'id')
        return Response(PhotoSerializer(updated, many=True).data, status=status.HTTP_200_OK)
