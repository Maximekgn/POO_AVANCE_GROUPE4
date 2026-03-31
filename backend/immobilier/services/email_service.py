"""
Service centralisé d'envoi d'emails pour ImmobilierPro.

Chaque fonction correspond à un événement métier précis,
exploite un template HTML dédié et peut inclure une version texte.

Usage rapide :
    from immobilier.services.email_service import EmailService
    EmailService.envoyer_bienvenue(utilisateur)
"""

from datetime import date
from django.utils import timezone
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

    @staticmethod
    def _envoyer_avec_piece_jointe(
        sujet: str,
        template: str,
        contexte: dict,
        destinataire: str,
        piece_jointe: dict
    ) -> bool:
        """
        Envoie un email HTML + version texte brute avec pièce jointe PDF.

        Paramètres
        ----------
        sujet        : Objet de l'email.
        template     : Chemin relatif du template HTML.
        contexte     : Dictionnaire de variables.
        destinataire : Adresse email du destinataire.
        piece_jointe : Dict avec 'filename', 'content', 'mimetype'.

        Retour
        ------
        True si l'envoi s'est effectué sans erreur, False sinon.
        """
        contexte.setdefault('year', date.today().year)
        try:
            print(f"[EmailService] Rendu template: {template}")
            html_content = render_to_string(template, contexte)
            text_content = strip_tags(html_content)

            print(f"[EmailService] Création message pour {destinataire}")
            msg = EmailMultiAlternatives(
                subject=sujet,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[destinataire],
            )
            msg.attach_alternative(html_content, "text/html")
            
            # Attacher le PDF
            print(f"[EmailService] Attachment PDF: {piece_jointe['filename']} ({len(piece_jointe['content'])} octets)")
            msg.attach(
                filename=piece_jointe["filename"],
                content=piece_jointe["content"],
                mimetype=piece_jointe["mimetype"]
            )
            
            print(f"[EmailService] Envoi en cours...")
            msg.send()
            print(f"[EmailService] Email envoyé avec succès !")
            return True
        except Exception as exc:
            print(f"[EmailService] ERREUR envoi email avec PJ à {destinataire} : {exc}")
            import traceback
            traceback.print_exc()
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
            sujet="✨ Bienvenue chez Miabe - Immo !",
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
    def envoyer_code_verification_email(
        cls,
        utilisateur,
        otp_code: str,
        validite_minutes: int = 10,
        url_verification: str = "/verify-email",
    ) -> bool:
        """Envoie un OTP de verification email pour activer le compte."""
        return cls._envoyer(
            sujet="Code OTP de verification de votre email — Miabe - Immo",
            template="emails/verification_email_otp.html",
            contexte={
                "prenom": utilisateur.first_name or utilisateur.username,
                "otp_code": otp_code,
                "validite_minutes": validite_minutes,
                "url_verification": url_verification,
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
            sujet=f"{sujet} — Miabe - Immo",
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
            sujet="🔐 Réinitialisation de votre mot de passe — Miabe - Immo",
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
            sujet=f"{'✅' if valide else '❌'} Mise à jour de votre bien — Miabe - Immo",
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
            sujet=f"📄 Mise à jour de votre dossier #{dossier.id} — Miabe - Immo",
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
            sujet=f"{'⚠️ Loyer impayé' if impaye else '📅 Rappel de paiement'} — Miabe - Immo",
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
                "url_dashboard": "/reservations?tab=envoyees",
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
        Inclut la facture PDF en pièce jointe.

        Paramètres
        ----------
        demandeur   : Instance du modèle Utilisateur (le locataire).
        demande     : Instance du modèle DemandeAction.
        url_paiement: Lien vers la page de paiement.
        """
        bien = getattr(demande, 'bien', None)
        if not bien or not demandeur.email:
            print(f"[EmailService] Impossible d'envoyer: bien={bien}, email={demandeur.email if demandeur else None}")
            return False

        # Générer un lien de paiement sécurisé
        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        import hashlib
        import time
        token_data = f"{demande.id}-{demande.demandeur_id}-{int(time.time())}"
        token = hashlib.sha256(token_data.encode()).hexdigest()[:32]
        payment_url = f"{frontend_url}/paiement/{demande.id}/{token}"

        print(f"[EmailService] Génération facture pour demande {demande.id}...")

        # Calculer les montants pour la facture
        loyer_hc = float(bien.loyer_hc) if bien.loyer_hc else 0
        charges = float(bien.charges) if bien.charges else 0
        caution_mois = bien.caution_mois or 1
        avance_mois = bien.avance_mois or 1
        frais_assistance = float(bien.frais_assistance) if bien.frais_assistance else 0

        total_caution = loyer_hc * caution_mois
        total_avance = loyer_hc * avance_mois
        total_loyer_charges = (loyer_hc + charges)
        total_a_payer = total_caution + total_avance + total_loyer_charges + frais_assistance

        print(f"[EmailService] Montants: loyer={loyer_hc}, charges={charges}, caution={caution_mois}, avance={avance_mois}")
        print(f"[EmailService] Total à payer: {total_a_payer}")

        # Générer la facture PDF
        pdf_buffer = None
        try:
            from immobilier.services.billing_service import BillingService
            pdf_buffer = BillingService.generate_lease_invoice_pdf(
                demande=demande,
                loyer_hc=loyer_hc,
                charges=charges,
                caution_mois=caution_mois,
                avance_mois=avance_mois,
                frais_assistance=frais_assistance,
                total_a_payer=total_a_payer,
            )
            print(f"[EmailService] PDF généré avec succès: {pdf_buffer.tell()} octets")
        except Exception as e:
            print(f"[EmailService] ERREUR génération PDF: {e}")
            import traceback
            traceback.print_exc()

        # Préparer le contexte de l'email
        contexte = {
            "prenom": demandeur.first_name or demandeur.username,
            "reference_bien": bien.reference,
            "adresse_bien": f"{bien.adresse}, {bien.ville}",
            "montant_total": f"{total_a_payer:,.0f}",
            "date_debut": demande.date_debut.strftime("%d/%m/%Y") if demande.date_debut else "N/A",
            "date_fin": demande.date_fin.strftime("%d/%m/%Y") if demande.date_fin else "N/A",
            "url_paiement": payment_url,
            "url_dashboard": f"{frontend_url}/reservations?tab=envoyees",
            "detail_caution": f"{total_caution:,.0f}",
            "detail_avance": f"{total_avance:,.0f}",
            "detail_loyer": f"{total_loyer_charges:,.0f}",
            "detail_frais": f"{frais_assistance:,.0f}",
        }

        # Envoyer l'email avec ou sans PDF
        if pdf_buffer:
            print(f"[EmailService] Envoi email AVEC PDF à {demandeur.email}...")
            result = cls._envoyer_avec_piece_jointe(
                sujet=f"💳 Paiement requis + Facture — {bien.reference} — Miabe Immo",
                template="emails/demande_paiement.html",
                contexte=contexte,
                destinataire=demandeur.email,
                piece_jointe={
                    "filename": f"Facture_{bien.reference}_{demandeur.last_name or 'locataire'}.pdf",
                    "content": pdf_buffer.getvalue(),
                    "mimetype": "application/pdf"
                }
            )
            print(f"[EmailService] Résultat envoi: {result}")
            return result
        else:
            print(f"[EmailService] Envoi email SANS PDF à {demandeur.email}...")
            result = cls._envoyer(
                sujet=f"💳 Paiement requis pour votre location — {bien.reference} — Miabe Immo",
                template="emails/demande_paiement.html",
                contexte=contexte,
                destinataire=demandeur.email,
            )
            print(f"[EmailService] Résultat envoi: {result}")
            return result

    @classmethod
    def envoyer_facture_paiement(cls, destinataire, demande, total_a_payer, pdf_buffer) -> bool:
        """
        Envoie la facture PDF par email au locataire avec la facture en pièce jointe.

        Paramètres
        ----------
        destinataire : Email du locataire.
        demande      : Instance du modèle DemandeAction.
        total_a_payer: Montant total à payer en FCFA.
        pdf_buffer   : BytesIO contenant le PDF de la facture.
        """
        bien = getattr(demande, 'bien', None)
        if not bien or not destinataire:
            return False

        from django.core.mail import EmailMessage
        from django.conf import settings

        try:
            email = EmailMessage(
                subject=f"📄 Facture de location - {bien.reference} — Miabe Immo",
                body=f"""
                Bonjour {demande.demandeur.first_name or demande.demandeur.username},

                Vous avez accepté une demande de location pour le bien suivant :
                - Référence : {bien.reference}
                - Adresse : {bien.adresse}, {bien.ville}
                - Période : du {demande.date_debut.strftime('%d/%m/%Y') if demande.date_debut else 'N/A'} au {demande.date_fin.strftime('%d/%m/%Y') if demande.date_fin else 'N/A'}

                MONTANT TOTAL À PAYER : {total_a_payer:,.0f} FCFA

                Cette facture détaille :
                - Le loyer mensuel Hors Charges
                - Les charges mensuelles
                - La caution
                - L'avance sur loyer
                - Les frais d'assistance
                - Le premier mois de loyer (HC + Charges)

                Veuillez effectuer le paiement avant la date d'échéance.
                Modes de paiement acceptés : Mobile Money (Orange Money, MTN Mobile Money, Moov Money) ou Virement Bancaire.

                Cordialement,
                L'équipe Miabe Immo
                """,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[destinataire],
            )

            # Attacher le PDF
            email.attach(
                filename=f"Facture_{bien.reference}_{demande.demandeur.last_name}.pdf",
                content=pdf_buffer.getvalue(),
                mimetype="application/pdf"
            )

            email.send()
            return True
        except Exception as e:
            print(f"Erreur lors de l'envoi de la facture : {e}")
            return False

    @classmethod
    def envoyer_confirmation_paiement(cls, destinataire, demande, total_a_payer, receipt_pdf_buffer) -> bool:
        """
        Envoie un email de confirmation de paiement avec le reçu PDF en pièce jointe.

        Paramètres
        ----------
        destinataire : Email du locataire.
        demande      : Instance du modèle DemandeAction.
        total_a_payer: Montant total payé en FCFA.
        receipt_pdf_buffer : BytesIO contenant le PDF du reçu.
        """
        bien = getattr(demande, 'bien', None)
        if not bien or not destinataire:
            return False

        from django.core.mail import EmailMessage
        from django.conf import settings

        try:
            email = EmailMessage(
                subject=f"✅ Paiement confirmé - Reçu - {bien.reference} — Miabe Immo",
                body=f"""
                Bonjour {demande.demandeur.first_name or demandeur.demandeur.username},

                Nous vous confirmons que votre paiement pour la location du bien {bien.reference} a été enregistré avec succès.

                MONTANT PAYÉ : {total_a_payer:,.0f} FCFA

                Vous trouverez votre reçu officiel en pièce jointe de cet email.

                PROCHAINES ÉTAPES :
                1. Le propriétaire va finaliser votre contrat de bail
                2. Vous recevrez le bail signé par email
                3. Vous pourrez alors emménager dans votre nouveau logement

                Merci de votre confiance !

                Cordialement,
                L'équipe Miabe Immo
                """,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[destinataire],
            )

            # Attacher le PDF du reçu
            email.attach(
                filename=f"Recu_Paiement_{bien.reference}_{demande.demandeur.last_name}.pdf",
                content=receipt_pdf_buffer.getvalue(),
                mimetype="application/pdf"
            )

            email.send()
            return True
        except Exception as e:
            print(f"Erreur lors de l'envoi de la confirmation de paiement : {e}")
            return False

    @classmethod
    def envoyer_nouveau_message_chat(cls, destinataire, expediteur, contenu, url_chat: str = "/") -> bool:
        """
        Notifie un utilisateur par email lorsqu'il reçoit un nouveau message dans le chat.

        Paramètres
        ----------
        destinataire : Email du destinataire du message.
        expediteur   : Instance du modèle Utilisateur (l'expéditeur du message).
        contenu      : Contenu du message (extrait pour l'email).
        url_chat     : Lien vers le chat.
        """
        if not destinataire or not expediteur:
            return False

        # Tronquer le contenu si trop long
        contenu_apercu = contenu[:100] + "..." if len(contenu) > 100 else contenu

        return cls._envoyer(
            sujet=f"💬 Nouveau message de {expediteur.get_full_name() or expediteur.username} — Miabe Immo",
            template="emails/nouveau_message_chat.html",
            contexte={
                "prenom": destinataire.first_name or destinataire.username,
                "expediteur_nom": expediteur.get_full_name() or expediteur.username,
                "contenu_apercu": contenu_apercu,
                "url_chat": url_chat,
            },
            destinataire=destinataire,
        )

    @classmethod
    def envoyer_bail_signe(cls, destinataire, bail, bien, pdf_buffer, role: str = "locataire") -> bool:
        """
        Envoie le bail signé PDF aux deux parties.

        Paramètres
        ----------
        destinataire : Email du destinataire.
        bail         : Instance du modèle Bail.
        bien         : Instance du modèle Bien.
        pdf_buffer   : BytesIO contenant le PDF du bail.
        role         : "locataire" ou "proprietaire".
        """
        if not destinataire:
            return False

        from django.core.mail import EmailMessage
        from django.conf import settings

        try:
            email = EmailMessage(
                subject=f"📄 Bail signé - {bien.reference} — Miabe Immo",
                body=f"""
                Bonjour,

                Votre bail pour le bien {bien.reference} a été signé par toutes les parties et est maintenant effectif.

                BIEN : {bien.adresse}, {bien.ville}
                NUMÉRO DE BAIL : {bail.numero_bail}
                DATE D'ENTRÉE : {bail.date_entree.strftime('%d/%m/%Y') if bail.date_entree else 'N/A'}
                LOYER MENSUEL : {bail.loyer_actuel:,.0f} FCFA

                Vous trouverez le bail signé en pièce jointe de cet email.

                Conservez ce document précieusement, il vous sera demandé pour toutes les démarches administratives.

                Cordialement,
                L'équipe Miabe Immo
                """,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[destinataire],
            )

            # Attacher le PDF du bail
            email.attach(
                filename=f"Bail_{bien.reference}_{bail.numero_bail}.pdf",
                content=pdf_buffer.getvalue(),
                mimetype="application/pdf"
            )

            email.send()
            return True
        except Exception as e:
            print(f"Erreur lors de l'envoi du bail signé : {e}")
            return False
