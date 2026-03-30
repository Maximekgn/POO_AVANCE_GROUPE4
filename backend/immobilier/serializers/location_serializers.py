from rest_framework import serializers

from immobilier.models import Bail, SignatureBail


class BailSerializer(serializers.ModelSerializer):
    bien = serializers.SerializerMethodField()
    client_info = serializers.SerializerMethodField()
    proprietaire_info = serializers.SerializerMethodField()
    signatures = serializers.SerializerMethodField()

    class Meta:
        model = Bail
        fields = [
            'id',
            'numero_bail',
            'statut',
            'date_entree',
            'date_sortie',
            'date_signature_proprietaire',
            'date_signature_client',
            'loyer_actuel',
            'depot_garantie',
            'bien',
            'client_info',
            'proprietaire_info',
            'signatures',
        ]

    def get_bien(self, obj: Bail) -> dict:
        bien = getattr(obj, 'bien', None)
        if not bien:
            return {'reference': 'N/A', 'ville': 'N/A', 'adresse': 'N/A', 'id': None}
        return {
            'id': bien.id,
            'reference': bien.reference or 'N/A',
            'ville': bien.ville or 'N/A',
            'adresse': bien.adresse or 'N/A',
        }

    def get_client_info(self, obj: Bail) -> dict:
        client_info = getattr(obj, 'client_info', None)
        
        # Fallback: essayer de récupérer depuis la demande associée
        if not client_info:
            demande = getattr(obj, 'demande', None)
            if demande:
                demandeur = getattr(demande, 'demandeur', None)
                if demandeur:
                    return {
                        'id': None,
                        'utilisateur': {
                            'first_name': demandeur.first_name or 'N/A',
                            'last_name': demandeur.last_name or '',
                            'email': demandeur.email or 'N/A',
                            'telephone': getattr(demandeur, 'telephone', None),
                        }
                    }
        
        if not client_info:
            return {'id': None, 'utilisateur': {'first_name': 'N/A', 'last_name': '', 'email': 'N/A', 'telephone': None}}
        
        utilisateur = getattr(client_info, 'utilisateur', None)
        if not utilisateur:
            return {'id': client_info.id, 'utilisateur': {'first_name': 'N/A', 'last_name': '', 'email': 'N/A', 'telephone': None}}
        
        return {
            'id': client_info.id,
            'utilisateur': {
                'first_name': utilisateur.first_name or 'N/A',
                'last_name': utilisateur.last_name or '',
                'email': utilisateur.email or 'N/A',
                'telephone': utilisateur.telephone,
            }
        }

    def get_proprietaire_info(self, obj: Bail) -> dict:
        bien = getattr(obj, 'bien', None)
        if not bien:
            return None
        proprietaire_info = getattr(bien, 'proprietaire_info', None)
        if not proprietaire_info:
            return None
        utilisateur = getattr(proprietaire_info, 'utilisateur', None)
        if not utilisateur:
            return None
        return {
            'id': proprietaire_info.id,
            'utilisateur': {
                'first_name': utilisateur.first_name or '',
                'last_name': utilisateur.last_name or '',
                'email': utilisateur.email or '',
                'telephone': utilisateur.telephone,
            }
        }

    def get_signatures(self, obj: Bail) -> list:
        signatures = getattr(obj, 'signatures', None)
        if not signatures:
            return []
        return [
            {
                'id': s.id,
                'type_signataire': s.type_signataire,
                'utilisateur_id': s.utilisateur_id,
                'image_signature_url': s.image_signature_url or '',
                'date_signature': s.date_signature.isoformat() if s.date_signature else None,
            }
            for s in signatures.all()
        ]


class BailSignSerializer(serializers.Serializer):
    image_signature_url = serializers.URLField(required=False, allow_blank=True, allow_null=True)


class SignatureBailSerializer(serializers.ModelSerializer):
    class Meta:
        model = SignatureBail
        fields = [
            'id',
            'bail_id',
            'utilisateur_id',
            'type_signataire',
            'image_signature_url',
            'ip_adresse',
            'date_signature',
            'hash_integrite',
        ]