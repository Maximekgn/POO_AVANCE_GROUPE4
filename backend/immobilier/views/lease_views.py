from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from immobilier.models import Bail, SignatureBail
from immobilier.models.enums import StatutBailEnum, TypeSignataireEnum
from immobilier.serializers import BailSerializer, BailSignSerializer


class BailListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        queryset = Bail.objects.select_related('bien__proprietaire_info__utilisateur', 'client_info__utilisateur').all()

        if request.user.is_staff or request.user.is_superuser:
            pass
        else:
            queryset = queryset.filter(
                Q(bien__proprietaire_info__utilisateur_id=request.user.id)
                | Q(client_info__utilisateur_id=request.user.id)
            )

        queryset = queryset.order_by('-date_entree', '-id')
        serializer = BailSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class BailDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_object(self, request: Request, pk: int) -> Bail:
        bail = get_object_or_404(
            Bail.objects.select_related('bien__proprietaire_info__utilisateur', 'client_info__utilisateur'),
            pk=pk,
        )

        if request.user.is_staff or request.user.is_superuser:
            return bail

        owner_id = getattr(getattr(getattr(bail, 'bien', None), 'proprietaire_info', None), 'utilisateur_id', None)
        client_id = getattr(getattr(bail, 'client_info', None), 'utilisateur_id', None)
        if request.user.id not in {owner_id, client_id}:
            raise PermissionDenied('Acces refuse a ce bail.')

        return bail

    def get(self, request: Request, pk: int) -> Response:
        bail = self._get_object(request, pk)
        serializer = BailSerializer(bail)
        payload = dict(serializer.data)
        payload['signatures'] = [
            {
                'id': s.id,
                'type_signataire': s.type_signataire,
                'utilisateur_id': s.utilisateur_id,
                'image_signature_url': s.image_signature_url,
                'date_signature': s.date_signature,
            }
            for s in bail.signatures.all().order_by('date_signature', 'id')
        ]
        return Response(payload, status=status.HTTP_200_OK)


class BailSignView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: int) -> Response:
        bail = get_object_or_404(
            Bail.objects.select_related('bien__proprietaire_info__utilisateur', 'client_info__utilisateur'),
            pk=pk,
        )

        owner_id = getattr(getattr(getattr(bail, 'bien', None), 'proprietaire_info', None), 'utilisateur_id', None)
        client_id = getattr(getattr(bail, 'client_info', None), 'utilisateur_id', None)

        if request.user.id == owner_id:
            sign_type = TypeSignataireEnum.PROPRIETAIRE
        elif request.user.id == client_id:
            sign_type = TypeSignataireEnum.LOCATAIRE
        else:
            raise PermissionDenied('Seuls les signataires du bail peuvent signer.')

        serializer = BailSignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        signature, created = SignatureBail.objects.get_or_create(
            bail=bail,
            utilisateur=request.user,
            type_signataire=sign_type,
            defaults={
                'image_signature_url': serializer.validated_data.get('image_signature_url') or None,
                'ip_adresse': request.META.get('REMOTE_ADDR'),
            },
        )

        if not created:
            signature.image_signature_url = serializer.validated_data.get('image_signature_url') or signature.image_signature_url
            signature.ip_adresse = request.META.get('REMOTE_ADDR')
            signature.date_signature = timezone.now()
            signature.save(update_fields=['image_signature_url', 'ip_adresse', 'date_signature'])

        now = timezone.now()
        changed_fields = []
        if sign_type == TypeSignataireEnum.PROPRIETAIRE and bail.date_signature_proprietaire is None:
            bail.date_signature_proprietaire = now
            changed_fields.append('date_signature_proprietaire')
        if sign_type == TypeSignataireEnum.LOCATAIRE and bail.date_signature_client is None:
            bail.date_signature_client = now
            changed_fields.append('date_signature_client')

        if bail.date_signature_proprietaire and bail.date_signature_client:
            if bail.statut != StatutBailEnum.EN_COURS:
                bail.statut = StatutBailEnum.EN_COURS
                changed_fields.append('statut')
        elif bail.statut == StatutBailEnum.BROUILLON:
            bail.statut = StatutBailEnum.EN_ATTENTE_SIGNATURE
            changed_fields.append('statut')

        if changed_fields:
            bail.save(update_fields=changed_fields)

        return Response(
            {
                'message': 'Signature enregistree.',
                'bail_id': bail.id,
                'type_signataire': sign_type,
                'statut_bail': bail.statut,
                'date_signature_proprietaire': bail.date_signature_proprietaire,
                'date_signature_client': bail.date_signature_client,
            },
            status=status.HTTP_200_OK,
        )