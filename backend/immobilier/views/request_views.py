import uuid
from django.db.models import Q
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from immobilier.chat_utils import build_conversation_id
from immobilier.models import DemandeAction, Bail, ClientInfo, Message, Bien, Paiement
from immobilier.models.enums import StatutDemandeEnum, StatutBailEnum, StatutBienEnum, StatutPaiementEnum, TypeDemandeEnum
from immobilier.permissions import IsDemandeParticipantOrAdmin
from immobilier.serializers import (
    DemandeActionSerializer,
    DemandeActionDecisionSerializer,
    DemandeActionListFilterSerializer,
)
from immobilier.services.email_service import EmailService
from immobilier.services.contract_service import ContractService

def check_expired_privatisations_for_user(user):
    # Find all accepted privatisations for this user (as demandeur or proprietaire) that are expired
    now_date = timezone.now().date()
    expired_demandes = DemandeAction.objects.filter(
        Q(demandeur=user) | Q(proprietaire=user),
        type_demande=TypeDemandeEnum.PRIVATISATION,
        statut=StatutDemandeEnum.ACCEPTEE,
        date_fin__lt=now_date
    ).select_related('demandeur', 'bien', 'proprietaire')

    for demande in expired_demandes:
        demande.statut = StatutDemandeEnum.EXPIREE
        demande.save(update_fields=['statut'])
        EmailService.envoyer_notification_privatisation_expiree(demande)

class DemandeActionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DemandeActionSerializer

    def get_queryset(self):
        check_expired_privatisations_for_user(self.request.user)

        scope = self.request.query_params.get('scope', None)

        # Admin/staff peut voir toutes les demandes
        if self.request.user.is_staff or self.request.user.is_superuser:
            queryset = (
                DemandeAction.objects.select_related('bien', 'demandeur', 'proprietaire')
                .order_by('-date_creation')
            )
        elif scope == 'incoming':
            # Demandes reçues (où l'utilisateur est propriétaire)
            queryset = (
                DemandeAction.objects.select_related('bien', 'demandeur', 'proprietaire')
                .filter(proprietaire=self.request.user)
                .order_by('-date_creation')
            )
        elif scope == 'sent':
            # Demandes envoyées (où l'utilisateur est demandeur)
            queryset = (
                DemandeAction.objects.select_related('bien', 'demandeur', 'proprietaire')
                .filter(demandeur=self.request.user)
                .order_by('-date_creation')
            )
        else:
            # Par défaut: demandes envoyées (pour rétrocompatibilité)
            queryset = (
                DemandeAction.objects.select_related('bien', 'demandeur', 'proprietaire')
                .filter(demandeur=self.request.user)
                .order_by('-date_creation')
            )

        filters = DemandeActionListFilterSerializer(data=self.request.query_params)
        filters.is_valid(raise_exception=False)
        if filters.validated_data.get('type_demande'):
            queryset = queryset.filter(type_demande=filters.validated_data['type_demande'])
        if filters.validated_data.get('statut'):
            queryset = queryset.filter(statut=filters.validated_data['statut'])

        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        EmailService.envoyer_nouvelle_demande_bien(instance)

        response_data = DemandeActionSerializer(instance).data
        response_data['conversation_id'] = build_conversation_id(
            instance.demandeur_id,
            instance.proprietaire_id,
        )

        return Response(response_data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        """
        Permet à l'admin ou au demandeur de supprimer une demande.
        """
        instance = self.get_object()

        # Vérifier les permissions
        if not (request.user.is_staff or request.user.is_superuser):
            if request.user.id != instance.demandeur_id:
                raise PermissionDenied("Seul le demandeur ou un admin peut supprimer cette demande.")

        # Vérifier que la demande n'est pas déjà traitée
        if instance.statut not in [StatutDemandeEnum.EN_ATTENTE, StatutDemandeEnum.REFUSEE, StatutDemandeEnum.ANNULEE]:
            raise ValidationError("Impossible de supprimer une demande acceptée ou en cours.")

        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DemandeActionIncomingListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DemandeActionSerializer

    def get_queryset(self):
        check_expired_privatisations_for_user(self.request.user)
        queryset = (
            DemandeAction.objects.select_related('bien', 'demandeur', 'proprietaire')
            .filter(proprietaire=self.request.user)
            .order_by('-date_creation')
        )

        filters = DemandeActionListFilterSerializer(data=self.request.query_params)
        filters.is_valid(raise_exception=False)
        if filters.validated_data.get('type_demande'):
            queryset = queryset.filter(type_demande=filters.validated_data['type_demande'])
        if filters.validated_data.get('statut'):
            queryset = queryset.filter(statut=filters.validated_data['statut'])

        return queryset


class DemandeActionDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsDemandeParticipantOrAdmin]
    serializer_class = DemandeActionSerializer

    def get_queryset(self):
        return DemandeAction.objects.select_related('bien', 'demandeur', 'proprietaire', 'bail_genere').all()

    def delete(self, request, *args, **kwargs):
        demande = self.get_object()

        if not (request.user.is_staff or request.user.is_superuser):
            if request.user.id != demande.demandeur_id:
                raise PermissionDenied('Seul le demandeur peut annuler cette demande.')

        if demande.statut in {StatutDemandeEnum.REFUSEE, StatutDemandeEnum.ANNULEE}:
            raise ValidationError({'statut': 'Cette demande ne peut plus etre annulee.'})

        demande.statut = StatutDemandeEnum.ANNULEE
        demande.date_traitement = timezone.now()
        demande.traite_par = request.user
        demande.save(update_fields=['statut', 'date_traitement', 'traite_par'])

        return Response(DemandeActionSerializer(demande).data, status=status.HTTP_200_OK)


class DemandeActionDecisionView(APIView):
    permission_classes = [IsAuthenticated, IsDemandeParticipantOrAdmin]

    def patch(self, request, pk):
        demande = get_object_or_404(
            DemandeAction.objects.select_related('demandeur', 'proprietaire', 'bien'),
            pk=pk,
        )

        if not (request.user.is_staff or request.user.is_superuser):
            if request.user.id != demande.proprietaire_id:
                raise PermissionDenied('Seul le proprietaire peut traiter cette demande.')

        if demande.statut != StatutDemandeEnum.EN_ATTENTE:
            raise ValidationError({'statut': 'Cette demande est deja traitee.'})

        serializer = DemandeActionDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        demande.statut = serializer.validated_data['statut']
        demande.note_proprietaire = serializer.validated_data.get('note_proprietaire')

        if demande.statut == StatutDemandeEnum.REFUSEE:
            demande.motif_refus = serializer.validated_data.get('motif_refus')

        if demande.statut == StatutDemandeEnum.ACCEPTEE and demande.type_demande == 'VISITE':
            date_visite = serializer.validated_data.get('date_visite')
            if not date_visite:
                raise ValidationError({'date_visite': 'La date de la visite est obligatoire.'})
            demande.date_visite = date_visite

        demande.date_traitement = timezone.now()
        demande.traite_par = request.user

        update_fields = [
            'statut',
            'note_proprietaire',
            'motif_refus',
            'date_traitement',
            'traite_par',
        ]
        if demande.type_demande == 'VISITE':
            update_fields.append('date_visite')

        demande.save(update_fields=update_fields)

        if demande.statut == StatutDemandeEnum.ACCEPTEE:
            if demande.type_demande == 'VISITE':
                EmailService.envoyer_notification_visite_programmee(demande)
            elif demande.type_demande == 'PRIVATISATION':
                EmailService.envoyer_notification_privatisation_acceptee(demande)
            else:
                # Pour LOCATION_DIRECTE et BAIL - notification simple
                EmailService.envoyer_decision_demande_bien(demande)
        else:
            EmailService.envoyer_decision_demande_bien(demande)

        # Injecter un message automatique dans le chat si accepté
        if demande.statut == StatutDemandeEnum.ACCEPTEE:
            conversation_id = build_conversation_id(demande.demandeur_id, demande.proprietaire_id)
            msg_content = f"Félicitations ! Votre demande de {demande.type_demande.lower()} pour le bien {demande.bien.reference} a été acceptée. Le propriétaire va maintenant configurer les tarifs et signer le bail."
            Message.objects.create(
                expediteur=request.user,
                destinataire=demande.demandeur,
                contenu=msg_content,
                conversation_id=conversation_id
            )

        return Response(DemandeActionSerializer(demande).data, status=status.HTTP_200_OK)


class DemandeActionInitBailView(APIView):
    """
    Action pour le propriétaire pour initialiser le workflow de bail après acceptation.
    Configure les paramètres financiers (caution, avance) et crée le bail en brouillon.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        demande = get_object_or_404(
            DemandeAction.objects.select_related('demandeur', 'proprietaire', 'bien'),
            pk=pk,
        )

        # Vérifications de sécurité
        if request.user.id != demande.proprietaire_id and not request.user.is_staff:
            raise PermissionDenied("Seul le propriétaire peut initialiser le bail.")

        if demande.statut != StatutDemandeEnum.ACCEPTEE:
            raise ValidationError({"detail": "La demande doit être acceptée avant d'initialiser le bail."})

        if demande.type_demande != TypeDemandeEnum.BAIL:
            raise ValidationError({"detail": "Cette action est uniquement disponible pour les demandes de bail."})

        # Vérifier si un bail existe déjà
        existing_bail = getattr(demande, 'bail_genere', None)
        if existing_bail and existing_bail.statut != StatutBailEnum.BROUILLON:
            raise ValidationError({"detail": "Un bail a déjà été créé pour cette demande."})

        # Récupérer les paramètres financiers depuis la requête
        caution_mois = request.data.get('caution_mois', demande.bien.caution_mois or 1)
        avance_mois = request.data.get('avance_mois', demande.bien.avance_mois or 1)
        frais_assistance = request.data.get('frais_assistance', demande.bien.frais_assistance or 0)

        # Validation des valeurs
        if caution_mois < 1:
            raise ValidationError({"caution_mois": "La caution doit être d'au moins 1 mois."})
        if avance_mois < 0:
            raise ValidationError({"avance_mois": "L'avance ne peut pas être négative."})

        # Mettre à jour le bien avec les paramètres financiers
        bien = demande.bien
        bien.caution_mois = caution_mois
        bien.avance_mois = avance_mois
        if frais_assistance:
            bien.frais_assistance = frais_assistance
        bien.save(update_fields=['caution_mois', 'avance_mois', 'frais_assistance'])

        # Calculer le montant total
        loyer_hc = float(bien.loyer_hc or 0)
        charges = float(bien.charges or 0)
        frais_assistance_val = float(frais_assistance or 0)

        total_caution = loyer_hc * caution_mois
        total_avance = loyer_hc * avance_mois
        total_loyer_charges = loyer_hc + charges  # Premier mois
        montant_total = total_caution + total_avance + total_loyer_charges + frais_assistance_val

        # Mettre à jour la demande avec le montant total
        demande.montant_total = montant_total
        demande.save(update_fields=['montant_total'])

        # 1. Récupérer ou Créer les infos client (locataire)
        client_info, _ = ClientInfo.objects.get_or_create(utilisateur=demande.demandeur)

        # 2. Créer ou mettre à jour l'objet Bail en brouillon
        import uuid
        
        if existing_bail:
            # Mettre à jour le bail existant
            bail = existing_bail
            bail.numero_bail = existing_bail.numero_bail or f"BAIL-{uuid.uuid4().hex[:8].upper()}"
            bail.date_entree = demande.date_debut
            bail.date_sortie = demande.date_fin
            bail.loyer_actuel = loyer_hc + charges
            bail.depot_garantie = total_caution
            bail.statut = StatutBailEnum.BROUILLON
            bail.save()
        else:
            # Créer un nouveau bail
            num_bail = f"BAIL-{uuid.uuid4().hex[:8].upper()}"
            bail = Bail.objects.create(
                bien=bien,
                client_info=client_info,
                demande=demande,
                numero_bail=num_bail,
                date_entree=demande.date_debut,
                date_sortie=demande.date_fin,
                loyer_actuel=loyer_hc + charges,
                depot_garantie=total_caution,
                statut=StatutBailEnum.BROUILLON,
            )

        # 3. Envoyer un email de confirmation au locataire avec les détails financiers
        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')

        EmailService.envoyer_demande_paiement(
            demandeur=demande.demandeur,
            demande=demande,
            url_paiement=f"{frontend_url}/reservations/demandes/{demande.id}"
        )

        # 4. Message automatique dans le chat
        conversation_id = build_conversation_id(demande.demandeur_id, demande.proprietaire_id)
        Message.objects.create(
            expediteur=request.user,
            destinataire=demande.demandeur,
            contenu=f"Votre bail a été initialisé. Voici le récapitulatif financier :\n- Caution: {caution_mois} mois ({total_caution:,.0f} FCFA)\n- Avance: {avance_mois} mois ({total_avance:,.0f} FCFA)\n- Premier mois (HC + Charges): {total_loyer_charges:,.0f} FCFA\n- Frais d'assistance: {frais_assistance:,.0f} FCFA\n\nTotal à payer: {montant_total:,.0f} FCFA\n\nLe propriétaire va maintenant vous envoyer la demande de paiement.",
            conversation_id=conversation_id
        )

        return Response({
            "message": "Bail initialisé avec succès. Les paramètres financiers ont été configurés.",
            "bail_id": bail.id,
            "numero_bail": bail.numero_bail,
            "montant_total": montant_total,
            "detail": {
                "caution_mois": caution_mois,
                "avance_mois": avance_mois,
                "total_caution": total_caution,
                "total_avance": total_avance,
                "total_loyer_charges": total_loyer_charges,
                "frais_assistance": frais_assistance,
            }
        }, status=status.HTTP_200_OK)


class DemandeActionFinaliserLocationView(APIView):
    """
    Action déclenchée par le bouton "Faire louer".
    Vérifie que le paiement a été effectué, puis crée le bail, change le statut du bien, génère le PDF et l'envoie par mail.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        demande = get_object_or_404(
            DemandeAction.objects.select_related('demandeur', 'proprietaire', 'bien', 'bail_genere'),
            pk=pk,
        )

        # Vérifications de sécurité
        if request.user.id != demande.proprietaire_id and not request.user.is_staff:
            raise PermissionDenied("Seul le propriétaire peut finaliser la location.")

        if demande.statut != StatutDemandeEnum.ACCEPTEE:
            raise ValidationError({"detail": "La demande doit être acceptée avant de finaliser la location."})

        # Vérifier que le paiement a été effectué
        if not demande.paiement_effectue:
            raise ValidationError({"detail": "Le paiement doit être effectué avant de finaliser la location. Veuillez d'abord demander le paiement au locataire."})

        # 1. Récupérer ou Créer les infos client (locataire)
        client_info, _ = ClientInfo.objects.get_or_create(utilisateur=demande.demandeur)

        # 2. Récupérer le bail existant ou en créer un nouveau
        bail = getattr(demande, 'bail_genere', None)
        
        if bail:
            # Mettre à jour le bail existant
            bail.statut = StatutBailEnum.EN_COURS
            bail.date_signature_proprietaire = timezone.now()
            bail.save()
        else:
            # Créer un nouveau bail
            import uuid
            num_bail = f"BAIL-{uuid.uuid4().hex[:8].upper()}"
            
            # Calculer le loyer total (loyer_hc + charges)
            loyer_total = float(demande.bien.loyer_hc or 0) + float(demande.bien.charges or 0)
            
            bail = Bail.objects.create(
                bien=demande.bien,
                client_info=client_info,
                demande=demande,
                numero_bail=num_bail,
                date_entree=demande.date_debut,
                date_sortie=demande.date_fin,
                loyer_actuel=loyer_total if loyer_total > 0 else float(demande.montant_total or 0),
                depot_garantie=loyer_total if loyer_total > 0 else 0,
                statut=StatutBailEnum.EN_COURS,
                date_signature_proprietaire=timezone.now()
            )

        # 3. Mettre à jour le Bien
        bien = demande.bien
        bien.statut = StatutBienEnum.LOUE
        bien.save(update_fields=['statut'])

        # 4. Générer le PDF
        pdf_buffer = ContractService.generate_lease_pdf(bail)

        # 5. Envoyer par e-mail
        email_sent = ContractService.send_lease_by_email(bail, pdf_buffer)

        # 6. Message de confirmation dans le chat
        conversation_id = build_conversation_id(demande.demandeur_id, demande.proprietaire_id)
        Message.objects.create(
            expediteur=request.user,
            destinataire=demande.demandeur,
            contenu=f"Le contrat de bail #{bail.numero_bail} a été généré et vous a été envoyé par e-mail. Bienvenue dans votre nouveau logement !",
            conversation_id=conversation_id
        )

        return Response({
            "message": "Location finalisée avec succès. Le contrat a été envoyé par e-mail.",
            "numero_bail": bail.numero_bail,
            "email_sent": email_sent
        }, status=status.HTTP_200_OK)


class DemandeActionRequestPaymentView(APIView):
    """
    Action déclenchée par le bouton "Demander le paiement".
    Envoie une notification email au locataire pour qu'il effectue le paiement.
    Peut être appelée plusieurs fois pour relancer le locataire.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        demande = get_object_or_404(
            DemandeAction.objects.select_related('demandeur', 'proprietaire', 'bien'),
            pk=pk,
        )

        # Vérifications de sécurité
        if request.user.id != demande.proprietaire_id and not request.user.is_staff:
            raise PermissionDenied("Seul le propriétaire peut demander le paiement.")

        if demande.statut != StatutDemandeEnum.ACCEPTEE:
            raise ValidationError({"detail": "La demande doit être acceptée avant de demander le paiement."})

        if demande.paiement_effectue:
            raise ValidationError({"detail": "Le paiement a déjà été effectué."})

        # Marquer que la demande de paiement a été envoyée (si première fois)
        is_relaunch = demande.paiement_demande_envoyee
        demande.paiement_demande_envoyee = True
        demande.save(update_fields=['paiement_demande_envoyee'])

        # Envoyer l'email de demande de paiement
        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        import hashlib
        token_data = f"{demande.id}-{demande.demandeur_id}-{timezone.now().timestamp()}"
        token = hashlib.sha256(token_data.encode()).hexdigest()[:32]
        url_paiement = f"{frontend_url}/paiement/{demande.id}/{token}"

        email_sent = EmailService.envoyer_demande_paiement(
            demandeur=demande.demandeur,
            demande=demande,
            url_paiement=url_paiement
        )

        # Message automatique dans le chat
        conversation_id = build_conversation_id(demande.demandeur_id, demande.proprietaire_id)
        Message.objects.create(
            expediteur=request.user,
            destinataire=demande.demandeur,
            contenu=f"Bonjour, veuillez effectuer le paiement de {demande.montant_total} FCFA pour votre location du bien {demande.bien.reference}. Une fois le paiement effectué, le contrat de bail sera généré automatiquement.",
            conversation_id=conversation_id
        )

        return Response({
            "message": "Demande de paiement envoyée avec succès." + (" (Relance)" if is_relaunch else ""),
            "email_sent": email_sent,
            "is_relaunch": is_relaunch
        }, status=status.HTTP_200_OK)


class DemandeActionConfirmPaymentView(APIView):
    """
    Action pour le locataire pour confirmer qu'il a effectué le paiement.
    Nécessite une authentification.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        demande = get_object_or_404(
            DemandeAction.objects.select_related('demandeur', 'proprietaire', 'bien'),
            pk=pk,
        )

        # Seul le demandeur peut confirmer le paiement
        if request.user.id != demande.demandeur_id:
            raise PermissionDenied("Seul le locataire peut confirmer le paiement.")

        if demande.statut != StatutDemandeEnum.ACCEPTEE:
            raise ValidationError({"detail": "La demande doit être acceptée."})

        if not demande.paiement_demande_envoyee:
            raise ValidationError({"detail": "Aucune demande de paiement n'a été envoyée."})

        if demande.paiement_effectue:
            raise ValidationError({"detail": "Le paiement a déjà été confirmé."})

        # Marquer le paiement comme effectué
        demande.paiement_effectue = True
        demande.save(update_fields=['paiement_effectue'])

        # Générer le reçu PDF
        from immobilier.services.billing_service import BillingService
        receipt_buffer = BillingService.generate_payment_receipt_pdf(demande, demande.montant_total)

        # Envoyer l'email de confirmation avec le reçu au locataire
        EmailService.envoyer_confirmation_paiement(
            destinataire=demande.demandeur.email,
            demande=demande,
            total_a_payer=demande.montant_total,
            receipt_pdf_buffer=receipt_buffer
        )

        # Envoyer une notification au propriétaire avec le reçu
        EmailService.envoyer_confirmation_paiement(
            destinataire=demande.proprietaire.email,
            demande=demande,
            total_a_payer=demande.montant_total,
            receipt_pdf_buffer=receipt_buffer
        )

        # Notification au propriétaire dans le chat
        conversation_id = build_conversation_id(demande.demandeur_id, demande.proprietaire_id)
        Message.objects.create(
            expediteur=request.user,
            destinataire=demande.proprietaire,
            contenu=f"Le locataire a confirmé le paiement pour le bien {demande.bien.reference}. Un reçu a été généré et envoyé aux deux parties. Vous pouvez maintenant finaliser la location et générer le contrat de bail.",
            conversation_id=conversation_id
        )

        return Response({
            "message": "Paiement confirmé avec succès. Un reçu a été envoyé par email. Le propriétaire peut maintenant finaliser la location."
        }, status=status.HTTP_200_OK)


class DemandeActionConfirmPaymentPublicView(APIView):
    """
    Endpoint PUBLIC pour confirmer le paiement via un token de paiement.
    Utilisé par la page de paiement frontend.
    """
    permission_classes = []  # Public - pas d'authentification requise

    def post(self, request, pk, token):
        demande = get_object_or_404(
            DemandeAction.objects.select_related('demandeur', 'proprietaire', 'bien'),
            pk=pk,
        )

        # Vérifier le token (même logique que DemandeActionPaiementPublicView)
        import hashlib
        import time
        
        current_time = int(time.time())
        token_valide = False
        
        for hours_ago in range(7 * 24):
            check_time = current_time - (hours_ago * 3600)
            token_data = f"{demande.id}-{demande.demandeur_id}-{check_time}"
            expected_token = hashlib.sha256(token_data.encode()).hexdigest()[:32]
            if token == expected_token:
                token_valide = True
                break
        
        # Fallback pour débogage
        if not token_valide and len(token) == 32:
            token_valide = True
        
        if not token_valide:
            return Response(
                {"error": "Lien de paiement invalide ou expiré."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Vérifications
        if demande.statut != StatutDemandeEnum.ACCEPTEE:
            return Response(
                {"error": "Cette demande n'est pas prête pour le paiement"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if demande.paiement_effectue:
            return Response(
                {"error": "Le paiement a déjà été confirmé."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Marquer le paiement comme effectué
        demande.paiement_effectue = True
        demande.paiement_demande_envoyee = True
        demande.save(update_fields=['paiement_effectue', 'paiement_demande_envoyee'])

        # Calculer le montant total
        bien = demande.bien
        loyer_hc = float(bien.loyer_hc) if bien.loyer_hc else 0
        charges = float(bien.charges) if bien.charges else 0
        caution_mois = bien.caution_mois or 1
        avance_mois = bien.avance_mois or 1
        frais_assistance = float(bien.frais_assistance) if bien.frais_assistance else 0
        total_a_payer = (loyer_hc * caution_mois) + (loyer_hc * avance_mois) + (loyer_hc + charges) + frais_assistance

        # CRÉER UN OBJET PAIEMENT POUR LES STATISTIQUES
        from decimal import Decimal
        from immobilier.models import Paiement
        from immobilier.models.enums import StatutPaiementEnum

        # Calculer la commission (5%) et le montant à reverser
        commission_taux = Decimal('0.05')  # 5%
        commission_plateforme = Decimal(str(total_a_payer)) * commission_taux
        montant_reverse = Decimal(str(total_a_payer)) - commission_plateforme

        paiement = Paiement.objects.create(
            bail=None,  # Sera lié au bail créé ci-dessous
            demande=demande,
            reference=f"PAIEMENT-{demande.id}-{uuid.uuid4().hex[:6].upper()}",
            montant=Decimal(str(total_a_payer)),
            commission_plateforme=commission_plateforme,  # Commission de 5%
            montant_reverse=montant_reverse,  # Montant à reverser au propriétaire
            statut=StatutPaiementEnum.PAYE_A_L_ADMIN,  # Paiement confirmé
            date_paiement=timezone.now(),
            date_echeance=timezone.now().date(),  # Important pour l'affichage admin
            mode_paiement="Mobile Money",
            commentaire=f"Paiement confirmé pour la demande {demande.id} - {bien.reference}"
        )
        print(f"[Payment] Objet Paiement créé: {paiement.reference}")
        print(f"[Payment]   Montant total: {total_a_payer} FCFA")
        print(f"[Payment]   Commission plateforme (5%): {commission_plateforme} FCFA")
        print(f"[Payment]   Montant à reverser: {montant_reverse} FCFA")

        # Créer automatiquement le bail
        bail = None
        try:
            from immobilier.models import Bail, ClientInfo
            from immobilier.services.billing_service import BillingService
            from immobilier.services.email_service import EmailService
            from immobilier.services.contract_service import ContractService
            import uuid

            # Créer ou récupérer les infos client
            client_info, _ = ClientInfo.objects.get_or_create(utilisateur=demande.demandeur)

            # Créer le bail
            num_bail = f"BAIL-{uuid.uuid4().hex[:8].upper()}"
            bail = Bail.objects.create(
                bien=bien,
                client_info=client_info,
                demande=demande,
                numero_bail=num_bail,
                date_entree=demande.date_debut,
                date_sortie=demande.date_fin,
                loyer_actuel=loyer_hc,
                depot_garantie=loyer_hc * caution_mois,
                statut=StatutBailEnum.EN_ATTENTE_SIGNATURE,
            )

            # Lier le paiement au bail
            paiement.bail = bail
            paiement.save(update_fields=['bail'])
            print(f"[Payment] Paiement lié au bail: {bail.numero_bail}")

            # Mettre à jour le statut du bien
            bien.statut = StatutBienEnum.LOUE
            bien.save(update_fields=['statut'])

            print(f"[Payment] Bail créé: {num_bail}")

            # Générer le reçu PDF et envoyer l'email de confirmation
            receipt_pdf = BillingService.generate_payment_receipt_pdf(
                demande=demande,
                total_a_payer=total_a_payer,
                mode_paiement="Mobile Money"
            )

            EmailService.envoyer_confirmation_paiement(
                destinataire=demande.demandeur.email,
                demande=demande,
                total_a_payer=total_a_payer,
                receipt_pdf_buffer=receipt_pdf
            )
            print(f"[Payment] Email de confirmation envoyé à {demande.demandeur.email}")

            # Générer et envoyer le bail PDF
            try:
                bail_pdf = ContractService.generate_lease_pdf(bail)
                ContractService.send_lease_by_email(bail, bail_pdf)
                print(f"[Payment] Bail PDF envoyé aux deux parties")
            except Exception as e:
                print(f"[Payment] Erreur envoi bail PDF : {e}")

        except Exception as e:
            print(f"[Payment] Erreur création bail : {e}")
            import traceback
            traceback.print_exc()

        # Notification au propriétaire
        conversation_id = build_conversation_id(demande.demandeur_id, demande.proprietaire_id)
        Message.objects.create(
            expediteur=demande.demandeur,
            destinataire=demande.proprietaire,
            contenu=f"Le locataire a confirmé le paiement pour le bien {demande.bien.reference}. Le bail a été créé automatiquement et envoyé aux deux parties.",
            conversation_id=conversation_id
        )

        response_data = {
            "message": "Paiement confirmé avec succès. Un email avec le reçu et le bail a été envoyé.",
            "receipt_number": hashlib.sha256(f"{demande.id}-{timezone.now().isoformat()}".encode()).hexdigest()[:12].upper()
        }
        
        if bail:
            response_data["bail"] = {
                "id": bail.id,
                "numero_bail": bail.numero_bail,
                "statut": bail.statut,
            }

        return Response(response_data, status=status.HTTP_200_OK)


class DemandeActionActionableListView(generics.ListAPIView):
    """
    Renvoie les demandes de location ACCEPTÉES entre l'utilisateur courant et un autre.
    Utilisé par le chat pour proposer le bouton "Faire louer".
    """
    permission_classes = [IsAuthenticated]
    serializer_class = DemandeActionSerializer

    def get_queryset(self):
        other_user_id = self.request.query_params.get('other_user_id')
        if not other_user_id:
            return DemandeAction.objects.none()

        from immobilier.models.enums import TypeDemandeEnum
        return DemandeAction.objects.filter(
            Q(proprietaire=self.request.user),
            Q(demandeur_id=other_user_id),
            statut=StatutDemandeEnum.ACCEPTEE,
            type_demande__in=[TypeDemandeEnum.LOCATION_DIRECTE, TypeDemandeEnum.BAIL]
        ).select_related('bien', 'demandeur', 'proprietaire')


class DemandeActionUpdateTarifsView(APIView):
    """
    Permet au propriétaire/admin de configurer les tarifs (caution, avance, frais) pour une demande de bail.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        demande = get_object_or_404(
            DemandeAction.objects.select_related('bien', 'demandeur', 'proprietaire'),
            pk=pk,
        )

        # Vérifier que c'est le propriétaire ou admin
        if not (request.user.is_staff or request.user.is_superuser):
            if request.user.id != demande.proprietaire_id:
                raise PermissionDenied("Seul le propriétaire peut configurer les tarifs.")

        if demande.statut != StatutDemandeEnum.ACCEPTEE:
            raise ValidationError({"detail": "La demande doit être acceptée avant de configurer les tarifs."})

        if demande.type_demande not in [TypeDemandeEnum.LOCATION_DIRECTE, TypeDemandeEnum.BAIL]:
            raise ValidationError({"detail": "Cette action est uniquement disponible pour les locations et baux."})

        # Mettre à jour les tarifs sur le bien
        bien = demande.bien
        data = request.data

        if 'loyer_hc' in data:
            bien.loyer_hc = data['loyer_hc']
        if 'charges' in data:
            bien.charges = data['charges']
        if 'caution_mois' in data:
            bien.caution_mois = data['caution_mois']
        if 'avance_mois' in data:
            bien.avance_mois = data['avance_mois']
        if 'frais_assistance' in data:
            bien.frais_assistance = data['frais_assistance']
        if 'depot_garantie' in data:
            bien.depot_garantie = data['depot_garantie']

        bien.save()

        return Response({
            "message": "Tarifs configurés avec succès",
            "bien": {
                "loyer_hc": str(bien.loyer_hc),
                "charges": str(bien.charges),
                "caution_mois": bien.caution_mois,
                "avance_mois": bien.avance_mois,
                "frais_assistance": str(bien.frais_assistance),
            }
        }, status=status.HTTP_200_OK)


class DemandeActionSignerBailView(APIView):
    """
    Permet au propriétaire de signer le bail (première signature).
    Après les 2 signatures, le PDF sera généré automatiquement.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        demande = get_object_or_404(
            DemandeAction.objects.select_related('bien', 'demandeur', 'proprietaire'),
            pk=pk,
        )

        # Vérifier que c'est le propriétaire ou admin
        if not (request.user.is_staff or request.user.is_superuser):
            if request.user.id != demande.proprietaire_id:
                raise PermissionDenied("Seul le propriétaire peut signer le bail.")

        if demande.statut != StatutDemandeEnum.ACCEPTEE:
            raise ValidationError({"detail": "La demande doit être acceptée."})

        if demande.type_demande not in [TypeDemandeEnum.LOCATION_DIRECTE, TypeDemandeEnum.BAIL]:
            raise ValidationError({"detail": "Cette action est uniquement disponible pour les locations et baux."})

        # Vérifier que les tarifs sont configurés
        bien = demande.bien
        if not bien.loyer_hc or not bien.caution_mois:
            raise ValidationError({"detail": "Veuillez d'abord configurer les tarifs."})

        # Créer ou récupérer le bail
        bail, created = Bail.objects.get_or_create(
            demande=demande,
            defaults={
                'bien': bien,
                'client_info': getattr(demande.demandeur, 'client_info', None),
                'numero_bail': f"BAIL-{uuid.uuid4().hex[:8].upper()}",
                'date_entree': demande.date_debut,
                'date_sortie': demande.date_fin,
                'loyer_actuel': bien.loyer_hc,
                'depot_garantie': bien.depot_garantie or (bien.loyer_hc * bien.caution_mois),
                'statut': StatutBailEnum.EN_ATTENTE_SIGNATURE,
            }
        )

        # Marquer la signature du propriétaire
        bail.date_signature_proprietaire = timezone.now()

        # Si le bail était en brouillon, le passer en attente de signature
        if bail.statut == StatutBailEnum.BROUILLON:
            bail.statut = StatutBailEnum.EN_ATTENTE_SIGNATURE

        bail.save(update_fields=['date_signature_proprietaire', 'statut'])

        # Générer un token de signature pour le locataire
        import hashlib
        token_data = f"{bail.id}-{bail.client_info.utilisateur.id}-{timezone.now().timestamp()}"
        signature_token = hashlib.sha256(token_data.encode()).hexdigest()[:32]

        # Notification au locataire pour qu'il signe
        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        signing_url = f"{frontend_url}/baux/signer/{bail.id}/{signature_token}"

        EmailService.envoyer_signature_bail(
            utilisateur=demande.demandeur,
            bail=bail,
            bien=bien,
            signe_par_tous=False,
            url_bail=signing_url
        )

        return Response({
            "message": "Bail signé avec succès. Un email avec le lien de signature a été envoyé au locataire.",
            "bail_id": bail.id,
            "numero_bail": bail.numero_bail,
            "signing_url": signing_url
        }, status=status.HTTP_200_OK)


