from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.db.models import Avg, Q, Count
from django.utils import timezone

from immobilier.models import Incident, IncidentMessage, IncidentPhoto, Review, ReviewSignalement, Bail
from immobilier.serializers.incident_review_serializers import (
    IncidentSerializer, IncidentCreateSerializer, IncidentUpdateSerializer,
    IncidentMessageSerializer, IncidentPhotoSerializer,
    ReviewSerializer, ReviewCreateSerializer,
    ReviewSignalementSerializer, ReviewSignalementCreateSerializer,
)


class IncidentViewSet(viewsets.ModelViewSet):
    """
    CRUD pour les incidents.
    - List: GET /api/incidents
    - Create: POST /api/incidents
    - Retrieve: GET /api/incidents/{id}
    - Update: PATCH /api/incidents/{id}
    - Destroy: DELETE /api/incidents/{id}
    """
    queryset = Incident.objects.select_related('bien', 'locataire', 'proprietaire', 'assigne_a').prefetch_related('photos', 'messages')
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['titre', 'description', 'bien__adresse', 'bien__reference']
    ordering_fields = ['date_ouverture', 'urgence', 'statut']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return IncidentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return IncidentUpdateSerializer
        return IncidentSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        # Admin voit tout
        if user.is_staff or user.is_superuser:
            return self.queryset.all()
        
        # Locataire voit ses incidents
        if hasattr(user, 'incidents_signales'):
            locataire_qs = Incident.objects.filter(locataire=user)
        else:
            locataire_qs = Incident.objects.none()
        
        # Propriétaire voit les incidents de ses biens
        if hasattr(user, 'proprietaire_info'):
            proprio_qs = Incident.objects.filter(proprietaire=user)
        else:
            proprio_qs = Incident.objects.none()
        
        # Assigné voit les incidents qui lui sont assignés
        assigne_qs = Incident.objects.filter(assigne_a=user)
        
        return (locataire_qs | proprio_qs | assigne_qs).distinct()
    
    def perform_create(self, serializer):
        serializer.save()
        # TODO: Envoyer notification au propriétaire
    
    @action(detail=True, methods=['post'])
    def assigner(self, request, pk=None):
        """Assigner un incident à un prestataire."""
        incident = self.get_object()
        
        if not (request.user.is_staff or request.user.is_superuser or request.user == incident.proprietaire):
            return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        
        prestataire_id = request.data.get('prestataire_id')
        if not prestataire_id:
            return Response({'error': 'prestataire_id requis'}, status=status.HTTP_400_BAD_REQUEST)
        
        incident.assigne_a_id = prestataire_id
        incident.statut = 'EN_COURS'
        incident.save()
        
        return Response({'message': 'Incident assigné avec succès'})
    
    @action(detail=True, methods=['post'])
    def resoudre(self, request, pk=None):
        """Marquer un incident comme résolu."""
        incident = self.get_object()
        
        if not (request.user.is_staff or request.user.is_superuser or request.user == incident.proprietaire):
            return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        
        incident.statut = 'RESOLU'
        incident.resolution_notes = request.data.get('resolution_notes', '')
        incident.date_resolution = timezone.now()
        incident.save()
        
        return Response({'message': 'Incident marqué comme résolu'})
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Récupérer les messages d'un incident."""
        incident = self.get_object()
        messages = incident.messages.select_related('auteur').order_by('created_at')
        serializer = IncidentMessageSerializer(messages, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def ajouter_message(self, request, pk=None):
        """Ajouter un message à un incident."""
        incident = self.get_object()
        
        message = request.data.get('message')
        if not message:
            return Response({'error': 'Message requis'}, status=status.HTTP_400_BAD_REQUEST)
        
        msg = IncidentMessage.objects.create(
            incident=incident,
            auteur=request.user,
            message=message
        )
        
        return Response(IncidentMessageSerializer(msg).data, status=status.HTTP_201_CREATED)


class IncidentPhotoViewSet(viewsets.ModelViewSet):
    """
    Upload et gestion des photos d'incidents.
    """
    queryset = IncidentPhoto.objects.select_related('incident')
    serializer_class = IncidentPhotoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        incident_id = self.kwargs.get('incident_pk')
        if incident_id:
            return IncidentPhoto.objects.filter(incident_id=incident_id)
        return IncidentPhoto.objects.none()
    
    def perform_create(self, serializer):
        incident_id = self.kwargs.get('incident_pk')
        incident = Incident.objects.get(id=incident_id)
        serializer.save(incident=incident)


class ReviewViewSet(viewsets.ModelViewSet):
    """
    CRUD pour les avis.
    - List: GET /api/reviews
    - Create: POST /api/reviews
    - Retrieve: GET /api/reviews/{id}
    - Update: PATCH /api/reviews/{id}
    """
    queryset = Review.objects.select_related('bail', 'auteur').order_by('-date_creation')
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['date_creation', 'note_globale']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ReviewCreateSerializer
        return ReviewSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        # Admin voit tout
        if user.is_staff or user.is_superuser:
            return self.queryset.all()
        
        # Utilisateur voit ses avis donnés et reçus
        return Review.objects.filter(
            Q(auteur=user) | 
            Q(cible_type='LOCATAIRE_PROPRIO', cible_id=user.id) |
            Q(cible_type='PROPRIO_LOCATAIRE', cible_id=user.id)
        ).distinct()
    
    def perform_create(self, serializer):
        review = serializer.save()
        # Double aveugle: visible seulement si l'autre partie a aussi noté
        self.check_double_aveugle(review)
    
    def check_double_aveugle(self, review):
        """Vérifie le système de double aveugle."""
        bail = review.bail
        
        # Trouver l'autre avis (si existe)
        other_review = Review.objects.filter(
            bail=bail
        ).exclude(id=review.id).first()
        
        # Si les deux avis existent, les rendre visibles
        if other_review:
            review.est_visible = True
            review.save()
            other_review.est_visible = True
            other_review.save()
    
    @action(detail=False, methods=['get'])
    def par_cible(self, request):
        """Récupérer les avis pour une cible spécifique (bien ou utilisateur)."""
        cible_type = request.query_params.get('cible_type')
        cible_id = request.query_params.get('cible_id')
        
        if not cible_type or not cible_id:
            return Response({'error': 'cible_type et cible_id requis'}, status=status.HTTP_400_BAD_REQUEST)
        
        reviews = Review.objects.filter(
            cible_type=cible_type,
            cible_id=cible_id,
            est_visible=True
        ).select_related('auteur', 'bail').order_by('-date_creation')
        
        # Calculer statistiques
        stats = reviews.aggregate(
            moyenne=Avg('note_globale'),
            total=Count('id')
        )
        
        serializer = self.get_serializer(reviews, many=True)
        return Response({
            'reviews': serializer.data,
            'stats': stats
        })
    
    @action(detail=True, methods=['post'])
    def repondre(self, request, pk=None):
        """Répondre à un avis."""
        review = self.get_object()
        
        # Seul l'auteur de la cible peut répondre
        if review.cible_type == 'LOCATAIRE_PROPRIO':
            # Proprio répond à avis locataire
            if request.user.id != review.cible_id:
                return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        elif review.cible_type == 'PROPRIO_LOCATAIRE':
            # Locataire répond à avis proprio
            if request.user.id != review.cible_id:
                return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        
        review.reponse = request.data.get('reponse')
        review.date_reponse = timezone.now()
        review.save()
        
        return Response(ReviewSerializer(review).data)
    
    @action(detail=True, methods=['post'])
    def signaler(self, request, pk=None):
        """Signaler un avis inapproprié."""
        review = self.get_object()
        
        serializer = ReviewSignalementCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save(review=review)
        
        review.est_signale = True
        review.save()
        
        return Response({'message': 'Avis signalé avec succès'})


class ReviewSignalementViewSet(viewsets.ModelViewSet):
    """
    Gestion des signalements d'avis (Admin uniquement).
    """
    queryset = ReviewSignalement.objects.select_related('review', 'signaleur', 'traite_par')
    serializer_class = ReviewSignalementSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Admin voit tout
        if user.is_staff or user.is_superuser:
            return self.queryset.all()
        
        # Utilisateur voit ses signalements
        return ReviewSignalement.objects.filter(signaleur=user)
    
    @action(detail=True, methods=['post'])
    def traiter(self, request, pk=None):
        """Traiter un signalement (Admin uniquement)."""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Réservé aux admins'}, status=status.HTTP_403_FORBIDDEN)
        
        signalement = self.get_object()
        signalement.traite_par = request.user
        signalement.resolution = request.data.get('resolution')
        signalement.date_resolution = timezone.now()
        signalement.save()
        
        # Action sur la review
        action = request.data.get('action')
        if action == 'masquer':
            signalement.review.est_visible = False
            signalement.review.save()
        elif action == 'supprimer':
            signalement.review.delete()
        
        return Response({'message': 'Signalement traité'})


class StatsAvisView(APIView):
    """
    Statistiques globales des avis.
    GET /api/reviews/stats?cible_type=LOCATAIRE_PROPRIO&cible_id=123
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        cible_type = request.query_params.get('cible_type')
        cible_id = request.query_params.get('cible_id')
        
        if not cible_type or not cible_id:
            return Response({'error': 'cible_type et cible_id requis'}, status=status.HTTP_400_BAD_REQUEST)
        
        reviews = Review.objects.filter(
            cible_type=cible_type,
            cible_id=cible_id,
            est_visible=True
        )
        
        stats = reviews.aggregate(
            moyenne_globale=Avg('note_globale'),
            moyenne_proprete=Avg('note_proprete'),
            moyenne_exactitude=Avg('note_exactitude'),
            moyenne_communication=Avg('note_communication'),
            moyenne_emplacement=Avg('note_emplacement'),
            moyenne_enregistrement=Avg('note_enregistrement'),
            total=Count('id')
        )
        
        # Distribution des notes
        distribution = {
            str(i): reviews.filter(note_globale=i).count()
            for i in range(1, 6)
        }
        
        return Response({
            'stats': stats,
            'distribution': distribution,
            'badge_hote_verifie': stats['moyenne_globale'] and stats['moyenne_globale'] >= 4.5 and stats['total'] >= 10
        })
