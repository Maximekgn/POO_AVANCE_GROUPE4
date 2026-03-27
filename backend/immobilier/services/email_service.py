"""
Service centralisé d'envoi d'emails pour ImmobilierPro.

Chaque fonction correspond à un événement métier précis,
exploite un template HTML dédié et peut inclure une version texte.

Usage rapide :
    from immobilier.services.email_service import EmailService
    EmailService.envoyer_bienvenue(utilisateur)
"""

from datetime import date
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.db.models import Q

from immobilier.models import Utilisateur


class EmailService:
    """Service d'envoi d'emails transactionnels via SMTP Gmail."""

    # ─────────────────────────────────────────────
    #  Méthode interne commune
    # ─────────────────────────────────────────────

    @staticmethod
    def _envoyer(sujet: str, template: str, contexte: dict, destinataire: str) -> bool:
        """
        Envoie un email HTML + version texte brute en fallback.

        Paramètres
        ----------
        sujet       : Objet de l'email.
        template    : Chemin relatif du template HTML (depuis templates/).
        contexte    : Dictionnaire de variables injectées dans le template.
        destinataire: Adresse email du destinataire.

        Retour
        ------
        True si l'envoi s'est effectué sans erreur, False sinon.
        """
        contexte.setdefault('year', date.today().year)
        try:
            html_content = render_to_string(template, contexte)
            text_content = strip_tags(html_content)

            msg = EmailMultiAlternatives(
                subject=sujet,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[destinataire],
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send()
            return True
        except Exception as exc:
            # En production, remplacer par un vrai logger
            print(f"[EmailService] Erreur envoi email à {destinataire} : {exc}")
            return False

    # ─────────────────────────────────────────────
    #  1. Bienvenue / Inscription
    # ─────────────────────────────────────────────

    @classmethod
    def envoyer_bienvenue(cls, utilisateur, url_connexion: str = "/") -> bool:
        """
        Envoie un email de bienvenue après la création d'un compte.

        Paramètres
        ----------
        utilisateur  : Instance du modèle Utilisateur.
        url_connexion: Lien vers la page de connexion.
        """
        return cls._envoyer(
            sujet="✨ Bienvenue chez ImmoPlus !",
            template="emails/bienvenue.html",
            contexte={
                "prenom": utilisateur.first_name or utilisateur.username,
                "email": utilisateur.email,
                "role": "Admin" if (utilisateur.is_staff or utilisateur.is_superuser) else "Utilisateur",
                "url_connexion": url_connexion,
            },
            destinataire=utilisateur.email,
        )

    @classmethod
    def envoyer_statut_compte_admin(cls, utilisateur, statut: str, url_support: str = "/") -> bool:
        """Notifie l'utilisateur lors d'un changement de statut de compte par un administrateur."""
        statut = (statut or '').upper()
        labels = {
            'APPROUVE': ('✅ Compte approuvé', 'approuvé'),
            'REJETE': ('❌ Compte rejeté', 'rejeté'),
            'SUSPENDU': ('⛔ Compte suspendu', 'suspendu'),
        }
        sujet, statut_label = labels.get(statut, ('Mise à jour de votre compte', 'mis à jour'))

        return cls._envoyer(
            sujet=f"{sujet} — ImmoPlus",
            template="emails/statut_compte_admin.html",
            contexte={
                "prenom": utilisateur.first_name or utilisateur.username,
                "email": utilisateur.email,
                "statut": statut,
                "statut_label": statut_label,
                "url_support": url_support,
            },
            destinataire=utilisateur.email,
        )

    # ─────────────────────────────────────────────
    #  2. Réinitialisation de mot de passe
    # ─────────────────────────────────────────────

    @classmethod
    def envoyer_reinitialisation_mdp(cls, utilisateur, url_reset: str, validite_heures: int = 2) -> bool:
        """
        Envoie le lien de réinitialisation de mot de passe.

        Paramètres
        ----------
        utilisateur    : Instance du modèle Utilisateur.
        url_reset      : URL unique contenant le token de réinitialisation.
        validite_heures: Durée de validité du lien (en heures).
        """
        return cls._envoyer(
            sujet="🔐 Réinitialisation de votre mot de passe — ImmoPlus",
            template="emails/reinitialisation_mdp.html",
            contexte={
                "prenom": utilisateur.first_name or utilisateur.username,
                "url_reset": url_reset,
                "validite_heures": validite_heures,
            },
            destinataire=utilisateur.email,
        )

    # ─────────────────────────────────────────────
    #  3. Validation / Refus d'un bien
    # ─────────────────────────────────────────────

    @classmethod
    def envoyer_validation_bien(cls, proprietaire, bien, valide: bool, motif_refus: str = "", url_mon_espace: str = "/") -> bool:
        """
        Notifie le propriétaire de la validation ou du refus de son bien.

        Paramètres
        ----------
        proprietaire  : Instance du modèle Proprietaire.
        bien          : Instance du modèle Bien.
        valide        : True = validé, False = refusé.
        motif_refus   : Motif de refus (uniquement si valide=False).
        url_mon_espace: Lien vers l'espace propriétaire.
        """
        statut_label = "validé" if valide else "refusé"
        return cls._envoyer(
            sujet=f"{'✅' if valide else '❌'} Mise à jour de votre bien — ImmoPlus",
            template="emails/validation_bien.html",
            contexte={
                "prenom": proprietaire.first_name or proprietaire.username,
                "valide": valide,
                "reference_bien": bien.reference,
                "adresse_bien": bien.adresse,
                "loyer": bien.loyer_hc,
                "motif_refus": motif_refus,
                "url_mon_espace": url_mon_espace,
            },
            destinataire=proprietaire.email,
        )

    @classmethod
    def envoyer_nouveau_bien_admin(cls, bien, url_dashboard_admin: str = "/admin/dashboard/biens") -> bool:
        """Informe tous les administrateurs qu'un nouveau bien a ete soumis."""
        admin_emails = list(
            Utilisateur.objects.filter(Q(is_staff=True) | Q(is_superuser=True))
            .exclude(email__isnull=True)
            .exclude(email='')
            .values_list('email', flat=True)
            .distinct()
        )

        if not admin_emails:
            return False

        sent_all = True
        owner = getattr(getattr(bien, 'proprietaire_info', None), 'utilisateur', None)
        owner_name = (owner.get_full_name() or owner.email) if owner else 'Inconnu'

        for email in admin_emails:
            sent = cls._envoyer(
                sujet="Nouveau bien soumis pour validation",
                template="emails/nouveau_bien_admin.html",
                contexte={
                    "reference_bien": bien.reference,
                    "adresse_bien": bien.adresse,
                    "ville": bien.ville,
                    "proprietaire": owner_name,
                    "url_dashboard_admin": url_dashboard_admin,
                },
                destinataire=email,
            )
            sent_all = sent_all and sent

        return sent_all

    @classmethod
    def envoyer_nouvelle_demande_bien(cls, demande, url_dashboard: str = "/reservations") -> bool:
        """Notifie le proprietaire lorsqu'une nouvelle demande est creee sur son bien."""
        proprietaire = getattr(demande, 'proprietaire', None)
        demandeur = getattr(demande, 'demandeur', None)
        bien = getattr(demande, 'bien', None)

        if not proprietaire or not proprietaire.email or not bien:
            return False

        demandeur_nom = ""
        if demandeur:
            demandeur_nom = f"{demandeur.first_name or ''} {demandeur.last_name or ''}".strip() or demandeur.email

        return cls._envoyer(
            sujet=f"Nouvelle demande {demande.type_demande} sur votre bien",
            template="emails/nouvelle_demande_bien.html",
            contexte={
                "prenom": proprietaire.first_name or proprietaire.username,
                "reference_bien": bien.reference,
                "adresse_bien": bien.adresse,
                "type_demande": demande.type_demande,
                "date_debut": demande.date_debut.strftime("%d/%m/%Y"),
                "date_fin": demande.date_fin.strftime("%d/%m/%Y"),
                "duree_jours": demande.duree_jours,
                "demandeur_nom": demandeur_nom,
                "message": demande.message or "",
                "url_dashboard": url_dashboard,
            },
            destinataire=proprietaire.email,
        )

    @classmethod
    def envoyer_decision_demande_bien(cls, demande, url_dashboard: str = "/trips") -> bool:
        """Notifie le demandeur lorsque le proprietaire accepte ou refuse sa demande."""
        demandeur = getattr(demande, 'demandeur', None)
        proprietaire = getattr(demande, 'proprietaire', None)
        bien = getattr(demande, 'bien', None)

        if not demandeur or not demandeur.email or not bien:
            return False

        proprietaire_nom = ""
        if proprietaire:
            proprietaire_nom = f"{proprietaire.first_name or ''} {proprietaire.last_name or ''}".strip() or proprietaire.email

        est_acceptee = demande.statut == 'ACCEPTEE'

        return cls._envoyer(
            sujet=(
                f"Votre demande {demande.type_demande} a ete {'acceptee' if est_acceptee else 'refusee'}"
            ),
            template="emails/decision_demande_bien.html",
            contexte={
                "prenom": demandeur.first_name or demandeur.username,
                "reference_bien": bien.reference,
                "adresse_bien": bien.adresse,
                "type_demande": demande.type_demande,
                "statut": demande.statut,
                "est_acceptee": est_acceptee,
                "motif_refus": demande.motif_refus or "",
                "note_proprietaire": demande.note_proprietaire or "",
                "proprietaire_nom": proprietaire_nom,
                "date_debut": demande.date_debut.strftime("%d/%m/%Y"),
                "date_fin": demande.date_fin.strftime("%d/%m/%Y"),
                "url_dashboard": url_dashboard,
            },
            destinataire=demandeur.email,
        )

    @classmethod
    def envoyer_notification_visite_programmee(cls, demande, url_dashboard: str = "/trips") -> bool:
        """Notifie le demandeur que sa visite est programmée."""
        demandeur = getattr(demande, 'demandeur', None)
        bien = getattr(demande, 'bien', None)
        date_visite = getattr(demande, 'date_visite', None)

        if not demandeur or not demandeur.email or not bien or not date_visite:
            return False

        return cls._envoyer(
            sujet="📅 Votre visite a été programmée",
            template="emails/notification_visite.html",
            contexte={
                "prenom": demandeur.first_name or demandeur.username,
                "reference_bien": bien.reference,
                "adresse_bien": bien.adresse,
                "date_visite": date_visite.strftime("%d/%m/%Y à %H:%M"),
                "url_dashboard": url_dashboard,
            },
            destinataire=demandeur.email,
        )

    @classmethod
    def envoyer_notification_privatisation_acceptee(cls, demande, url_dashboard: str = "/reservations") -> bool:
        """Notifie le demandeur que sa demande de privatisation est acceptée."""
        demandeur = getattr(demande, 'demandeur', None)
        bien = getattr(demande, 'bien', None)

        if not demandeur or not demandeur.email or not bien:
            return False

        return cls._envoyer(
            sujet="🎉 Votre demande de privatisation est acceptée",
            template="emails/notification_privatisation_acceptee.html",
            contexte={
                "prenom": demandeur.first_name or demandeur.username,
                "reference_bien": bien.reference,
                "adresse_bien": bien.adresse,
                "date_fin": demande.date_fin.strftime("%d/%m/%Y"),
                "url_dashboard": url_dashboard,
            },
            destinataire=demandeur.email,
        )

    @classmethod
    def envoyer_notification_privatisation_expiree(cls, demande, url_dashboard: str = "/reservations") -> bool:
        """Notifie le demandeur que sa réservation/privatisation a expiré."""
        demandeur = getattr(demande, 'demandeur', None)
        bien = getattr(demande, 'bien', None)

        if not demandeur or not demandeur.email or not bien:
            return False

        return cls._envoyer(
            sujet="⏳ Votre privatisation est arrivée à expiration",
            template="emails/notification_privatisation_expiree.html",
            contexte={
                "prenom": demandeur.first_name or demandeur.username,
                "reference_bien": bien.reference,
                "adresse_bien": bien.adresse,
                "date_fin": demande.date_fin.strftime("%d/%m/%Y"),
                "url_dashboard": url_dashboard,
            },
            destinataire=demandeur.email,
        )

    # ─────────────────────────────────────────────
    #  4. Mise à jour du statut d'un dossier
    # ─────────────────────────────────────────────

    @classmethod
    def envoyer_statut_dossier(cls, client, dossier, bien, url_mes_dossiers: str = "/") -> bool:
        """
        Notifie le client d'un changement de statut de son dossier.

        Paramètres
        ----------
        client          : Instance du modèle Client.
        dossier         : Instance du modèle Dossier.
        bien            : Instance du modèle Bien correspondant.
        url_mes_dossiers: Lien vers la liste des dossiers du client.
        """
        return cls._envoyer(
            sujet=f"📄 Mise à jour de votre dossier #{dossier.id} — ImmoPlus",
            template="emails/statut_dossier.html",
            contexte={
                "prenom": client.first_name or client.username,
                "id_dossier": dossier.id,
                "statut": dossier.statut,
                "reference_bien": bien.reference,
                "adresse_bien": bien.adresse,
                "motif_refus": dossier.motif_refus or "",
                "url_mes_dossiers": url_mes_dossiers,
            },
            destinataire=client.email,
        )

    # ─────────────────────────────────────────────
    #  5. Rappel de paiement / Loyer impayé
    # ─────────────────────────────────────────────

    @classmethod
    def envoyer_rappel_paiement(cls, client, paiement, bail, bien, url_paiements: str = "/") -> bool:
        """
        Envoie un rappel de paiement ou une alerte d'impayé au locataire.

        Paramètres
        ----------
        client       : Instance du modèle Client (locataire).
        paiement     : Instance du modèle Paiement.
        bail         : Instance du modèle Bail.
        bien         : Instance du modèle Bien.
        url_paiements: Lien vers l'historique des paiements.
        """
        impaye = paiement.statut == 'IMPAYE'
        return cls._envoyer(
            sujet=f"{'⚠️ Loyer impayé' if impaye else '📅 Rappel de paiement'} — ImmoPlus",
            template="emails/rappel_paiement.html",
            contexte={
                "prenom": client.first_name or client.username,
                "impaye": impaye,
                "adresse_bien": bien.adresse,
                "numero_bail": bail.numero_bail,
                "montant": paiement.montant,
                "date_echeance": paiement.date_echeance.strftime("%d/%m/%Y"),
                "mois_echeance": paiement.date_echeance.strftime("%B %Y"),
                "nb_jours_retard": paiement.getNbJoursRetard(),
                "url_paiements": url_paiements,
            },
            destinataire=client.email,
        )

    # ─────────────────────────────────────────────
    #  6. Notification de signature de bail
    # ─────────────────────────────────────────────

    @classmethod
    def envoyer_signature_bail(cls, utilisateur, bail, bien, signe_par_tous: bool, url_bail: str = "/") -> bool:
        """
        Notifie une partie que sa signature est requise ou que le bail est signé.

        Paramètres
        ----------
        utilisateur   : Instance du modèle Utilisateur (Client ou Proprietaire).
        bail          : Instance du modèle Bail.
        bien          : Instance du modèle Bien.
        signe_par_tous: True si les deux signatures sont réunies.
        url_bail      : Lien vers la page du bail.
        """
        return cls._envoyer(
            sujet=f"{'🎉 Bail signé' if signe_par_tous else '✍️ Signature requise'} — Bail {bail.numero_bail}",
            template="emails/signature_bail.html",
            contexte={
                "prenom": utilisateur.first_name or utilisateur.username,
                "signe_par_tous": signe_par_tous,
                "reference_bien": bien.reference,
                "adresse_bien": bien.adresse,
                "numero_bail": bail.numero_bail,
                "date_entree": bail.date_entree.strftime("%d/%m/%Y"),
                "loyer": bail.loyer_actuel,
                "url_bail": url_bail,
            },
            destinataire=utilisateur.email,
        )

    # ─────────────────────────────────────────────
    #  7. Demande de paiement avant bail
    # ─────────────────────────────────────────────

    @classmethod
    def envoyer_demande_paiement(cls, demandeur, demande, url_paiement: str = "/") -> bool:
        """
        Notifie le demandeur qu'il doit effectuer le paiement pour finaliser la location.

        Paramètres
        ----------
        demandeur   : Instance du modèle Utilisateur (le locataire).
        demande     : Instance du modèle DemandeAction.
        url_paiement: Lien vers la page de paiement.
        """
        bien = getattr(demande, 'bien', None)
        if not bien or not demandeur.email:
            return False

        return cls._envoyer(
            sujet=f"💳 Paiement requis pour votre location — ImmoPlus",
            template="emails/demande_paiement.html",
            contexte={
                "prenom": demandeur.first_name or demandeur.username,
                "reference_bien": bien.reference,
                "adresse_bien": bien.adresse,
                "montant_total": demande.montant_total,
                "date_debut": demande.date_debut.strftime("%d/%m/%Y"),
                "date_fin": demande.date_fin.strftime("%d/%m/%Y"),
                "url_paiement": url_paiement,
            },
            destinataire=demandeur.email,
        )
