from django.db import models
from django.utils.translation import gettext_lazy as _

class RoleEnum(models.TextChoices):
    ADMIN = 'ADMIN', _('Admin')
    PROPRIETAIRE = 'PROPRIETAIRE', _('Propriétaire')
    CLIENT = 'CLIENT', _('Client')

class StatutBienEnum(models.TextChoices):
    EN_ATTENTE_VALIDATION = 'EN_ATTENTE_VALIDATION', _('En attente de validation')
    VACANT = 'VACANT', _('Vacant')
    LOUE = 'LOUE', _('Loué')
    EN_TRAVAUX = 'EN_TRAVAUX', _('En travaux')

class StatutBailEnum(models.TextChoices):
    BROUILLON = 'BROUILLON', _('Brouillon')
    EN_ATTENTE_SIGNATURE = 'EN_ATTENTE_SIGNATURE', _('En attente de signature')
    EN_COURS = 'EN_COURS', _('En cours')
    EXPIRE = 'EXPIRE', _('Expiré')
    RESILIE = 'RESILIE', _('Résilié')

class StatutDossierEnum(models.TextChoices):
    SOUMIS = 'SOUMIS', _('Soumis')
    EN_ETUDE = 'EN_ETUDE', _('En étude')
    VALIDE = 'VALIDE', _('Validé')
    REFUSE = 'REFUSE', _('Refusé')

class StatutPaiementEnum(models.TextChoices):
    EN_ATTENTE = 'EN_ATTENTE', _('En attente')
    PAYE = 'PAYE', _('Payé')
    IMPAYE = 'IMPAYE', _('Impayé')

class TypeDocumentEnum(models.TextChoices):
    QUITTANCE = 'QUITTANCE', _('Quittance')
    BAIL = 'BAIL', _('Bail')
    JUSTIFICATIF = 'JUSTIFICATIF', _('Justificatif')
    PIECE_IDENTITE = 'PIECE_IDENTITE', _('Pièce d\'identité')

class TypeSignataireEnum(models.TextChoices):
    PROPRIETAIRE = 'PROPRIETAIRE', _('Propriétaire')
    LOCATAIRE = 'LOCATAIRE', _('Locataire')
