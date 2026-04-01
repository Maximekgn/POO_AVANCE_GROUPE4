from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.files.uploadedfile import UploadedFile
from django.utils import timezone
from immobilier.models import Utilisateur, ProprietaireInfo
from immobilier.serializers.document_serializers import DocumentUploadSerializer


class IdentityVerificationView(APIView):
    """
    Upload des documents de vérification d'identité.
    Required: piece_identite_recto, piece_identite_verso, photo_avec_piece
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        
        # Vérifier si tous les fichiers sont présents
        required_files = ['piece_identite_recto', 'piece_identite_verso', 'photo_avec_piece']
        missing_files = [f for f in required_files if f not in request.FILES]
        
        if missing_files:
            return Response(
                {'error': f'Fichiers manquants: {", ".join(missing_files)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Sauvegarder les fichiers
        user.piece_identite_recto = request.FILES['piece_identite_recto']
        user.piece_identite_verso = request.FILES['piece_identite_verso']
        user.photo_avec_piece = request.FILES['photo_avec_piece']
        user.verification_statut = 'EN_ATTENTE'
        user.documents_complets = True
        user.save(update_fields=[
            'piece_identite_recto',
            'piece_identite_verso',
            'photo_avec_piece',
            'verification_statut',
            'documents_complets'
        ])
        
        # Notification à l'admin pour vérification (à implémenter)
        
        return Response({
            'message': 'Documents soumis avec succès. En attente de vérification.',
            'statut': user.verification_statut
        }, status=status.HTTP_200_OK)


class PropertyVerificationView(APIView):
    """
    Upload des documents de vérification de propriété.
    Required: titre_propriete, video_avec_titre
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        
        # Vérifier si l'utilisateur a un ProprietaireInfo
        proprietaire_info, created = ProprietaireInfo.objects.get_or_create(
            utilisateur=user,
            defaults={
                'iban': '',
                'numero_piece': '',
            }
        )
        
        # Vérifier si tous les fichiers sont présents
        required_files = ['titre_propriete', 'video_avec_titre']
        missing_files = [f for f in required_files if f not in request.FILES]
        
        if missing_files:
            return Response(
                {'error': f'Fichiers manquants: {", ".join(missing_files)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Sauvegarder les fichiers
        proprietaire_info.titre_propriete = request.FILES['titre_propriete']
        proprietaire_info.video_avec_titre = request.FILES['video_avec_titre']
        proprietaire_info.save(update_fields=['titre_propriete', 'video_avec_titre'])
        
        return Response({
            'message': 'Documents de propriété soumis avec succès. En attente de vérification.',
            'propriete_verifiee': proprietaire_info.propriete_verifiee
        }, status=status.HTTP_200_OK)


class VerificationStatusView(APIView):
    """
    Vérifier le statut de vérification d'un utilisateur.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Récupérer ProprietaireInfo si existe
        proprietaire_info = getattr(user, 'proprietaire_info', None)
        
        return Response({
            'identity': {
                'statut': user.verification_statut,
                'motif_refus': user.verification_motif_refus,
                'documents_complets': user.documents_complets,
                'has_piece_identite': bool(user.piece_identite_recto and user.piece_identite_verso and user.photo_avec_piece),
            },
            'property': {
                'verifiee': proprietaire_info.propriete_verifiee if proprietaire_info else None,
                'motif_refus': proprietaire_info.propriete_motif_refus if proprietaire_info else None,
                'has_documents': bool(proprietaire_info and proprietaire_info.titre_propriete and proprietaire_info.video_avec_titre) if proprietaire_info else False,
            },
            'can_create_listing': user.verification_statut == 'VERIFIE' and (
                not proprietaire_info or proprietaire_info.propriete_verifiee
            ),
        }, status=status.HTTP_200_OK)
