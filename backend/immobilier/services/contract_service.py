import os
import io
from pathlib import Path
from django.core.mail import EmailMessage
from django.conf import settings
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import cm

class ContractService:
    @staticmethod
    def generate_lease_pdf(bail):
        """
        Génère un contrat de bail PDF simplifié pour un objet Bail donné.
        Retourne un objet BytesIO contenant le PDF.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=18,
            alignment=1, # Center
            spaceAfter=20
        )
        
        content = []
        
        # Titre
        content.append(Paragraph(f"CONTRAT DE BAIL À USAGE D'HABITATION", title_style))
        content.append(Paragraph(f"Référence : {bail.numero_bail}", styles['Normal']))
        content.append(Spacer(1, 0.5*cm))
        
        # Parties Prenantes
        content.append(Paragraph("<b>1. DÉSIGNATION DES PARTIES</b>", styles['Heading2']))
        content.append(Spacer(1, 0.2*cm))
        
        # Infos Propriétaire
        proprietaire_info = getattr(bail.bien, 'proprietaire_info', None)
        if proprietaire_info:
            proprietaire = proprietaire_info.utilisateur
            prop_text = f"<b>Le Bailleur :</b> {proprietaire.first_name} {proprietaire.last_name}<br/>Email : {proprietaire.email}"
        else:
            prop_text = "<b>Le Bailleur :</b> Informations non disponibles"
        content.append(Paragraph(prop_text, styles['Normal']))
        content.append(Spacer(1, 0.3*cm))
        
        # Infos Locataire
        client_info = getattr(bail, 'client_info', None)
        if client_info:
            client = client_info.utilisateur
            client_text = f"<b>Le Locataire :</b> {client.first_name} {client.last_name}<br/>Email : {client.email}"
        else:
            # Fallback: utiliser la demande
            demande = getattr(bail, 'demande', None)
            if demande:
                demandeur = getattr(demande, 'demandeur', None)
                if demandeur:
                    client_text = f"<b>Le Locataire :</b> {demandeur.first_name} {demandeur.last_name}<br/>Email : {demandeur.email}"
                else:
                    client_text = "<b>Le Locataire :</b> Informations non disponibles"
            else:
                client_text = "<b>Le Locataire :</b> Informations non disponibles"
        content.append(Paragraph(client_text, styles['Normal']))
        content.append(Spacer(1, 0.5*cm))
        
        # Le Bien
        content.append(Paragraph("<b>2. OBJET DU CONTRAT</b>", styles['Heading2']))
        content.append(Spacer(1, 0.2*cm))
        bien = bail.bien
        # Récupérer le type de bien
        type_bien = getattr(bien, 'sous_type', None)
        type_bien_label = type_bien.nom if type_bien else (getattr(bien, 'categorie', None).nom if getattr(bien, 'categorie', None) else 'Bien immobilier')
        
        bien_text = f"Le bailleur donne en location au locataire le bien immobilier suivant :<br/>" \
                    f"Type : {type_bien_label}<br/>" \
                    f"Adresse : {bien.ville}, {getattr(bien, 'quartier', '') or ''}<br/>" \
                    f"Référence Bien : {bien.reference}"
        content.append(Paragraph(bien_text, styles['Normal']))
        content.append(Spacer(1, 0.5*cm))
        
        # Conditions Financières
        content.append(Paragraph("<b>3. CONDITIONS FINANCIÈRES</b>", styles['Heading2']))
        content.append(Spacer(1, 0.2*cm))
        data = [
            ["Loyer mensuel", f"{bail.loyer_actuel} FCFA"],
            ["Dépôt de garantie", f"{bail.depot_garantie} FCFA"],
            ["Date d'entrée", str(bail.date_entree)],
            ["Date de fin prévue", str(bail.date_sortie or 'Non définie')],
        ]
        table = Table(data, colWidths=[6*cm, 8*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        content.append(table)
        content.append(Spacer(1, 1*cm))
        
        # Clauses de fin
        content.append(Paragraph("<b>4. SIGNATURES</b>", styles['Heading2']))
        content.append(Spacer(1, 0.5*cm))
        
        signature_data = [
            ["Fait à : ...........................", "Le : " + str(bail.date_signature_proprietaire or '')],
            ["Signature du Bailleur", "Signature du Locataire"],
            ["\n\n\n...........................", "\n\n\n..........................."]
        ]
        sig_table = Table(signature_data, colWidths=[8*cm, 8*cm])
        content.append(sig_table)
        
        doc.build(content)
        buffer.seek(0)
        return buffer

    @staticmethod
    def send_lease_by_email(bail, pdf_buffer):
        """
        Envoie le contrat de bail par email en pièce jointe.
        """
        client_email = bail.client_info.utilisateur.email
        subject = f"Votre contrat de bail - Référence {bail.numero_bail}"
        body = f"Bonjour {bail.client_info.utilisateur.first_name},\n\n" \
               f"Félicitations ! Votre demande de location a été acceptée et finalisée par le propriétaire.\n" \
               f"Vous trouverez ci-joint votre contrat de bail pour le bien {bail.bien.reference}.\n\n" \
               f"Merci d'utiliser notre plateforme de gestion immobilière."
        
        email = EmailMessage(
            subject,
            body,
            settings.DEFAULT_FROM_EMAIL,
            [client_email],
            cc=[bail.bien.proprietaire.email]
        )
        
        # Attacher le PDF
        email.attach(f"Contrat_Bail_{bail.numero_bail}.pdf", pdf_buffer.getvalue(), "application/pdf")
        
        try:
            return email.send(fail_silently=False)
        except Exception as e:
            print(f"Erreur d'envoi d'email : {e}")
            return False
