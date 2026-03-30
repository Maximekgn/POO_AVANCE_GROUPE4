import io
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import cm
from django.utils import timezone

class BillingService:
    @staticmethod
    def generate_invoice_pdf(paiement):
        """
        Génère une facture / quittance PDF pour un paiement donné.
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
        # Si le paiement est payé, c'est une Quittance, sinon c'est un Avis d'échéance/Facture
        est_paye = paiement.statut in ['PAYE', 'PAYE_A_L_ADMIN', 'REVERSE_AU_PROPRIETAIRE']
        titre = "QUITTANCE DE LOYER" if est_paye else "AVIS D'ÉCHÉANCE / FACTURE"
        content.append(Paragraph(f"<b>{titre}</b>", title_style))
        content.append(Paragraph(f"Référence : {paiement.reference}", styles['Normal']))
        content.append(Spacer(1, 0.5*cm))
        
        bail = paiement.bail
        bien = bail.bien
        
        # Infos Locataire
        client = bail.client_info.utilisateur
        client_text = f"<b>Locataire :</b> {client.first_name} {client.last_name}<br/>Email : {client.email}"
        content.append(Paragraph(client_text, styles['Normal']))
        content.append(Spacer(1, 0.3*cm))
        
        # Le Bien
        type_bien = getattr(bien, 'sous_type', None)
        type_bien_label = type_bien.nom if type_bien else (bien.categorie.nom if getattr(bien, 'categorie', None) else 'Bien immobilier')
        bien_text = f"<b>Bien loué :</b> {type_bien_label} - {bien.ville}, {bien.quartier or ''}"
        content.append(Paragraph(bien_text, styles['Normal']))
        content.append(Spacer(1, 1*cm))
        
        # Détails de facturation
        content.append(Paragraph("<b>DÉTAIL DE LA FACTURATION</b>", styles['Heading2']))
        content.append(Spacer(1, 0.2*cm))
        
        statut_str = "Payé" if est_paye else "En attente de paiement"
        if paiement.statut == 'IMPAYE':
            statut_str = "Impayé (En retard)"
            
        data = [
            ["Désignation", "Montant"],
            [paiement.commentaire or f"Loyer échéance {paiement.date_echeance.strftime('%B %Y')}", f"{paiement.montant} FCFA"],
            ["Date d'échéance prévue", paiement.date_echeance.strftime("%d/%m/%Y")],
            ["Statut du paiement", statut_str],
        ]
        
        if est_paye and paiement.date_paiement:
            data.append(["Date du règlement", paiement.date_paiement.strftime("%d/%m/%Y")])
            data.append(["Mode de paiement", paiement.mode_paiement or "Non spécifié"])
            
        table = Table(data, colWidths=[10*cm, 6*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'), # Header bold
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        content.append(table)
        content.append(Spacer(1, 1*cm))
        
        # Message de bas de page
        if est_paye:
            content.append(Paragraph("<i>Nous avons bien reçu votre paiement. Cette quittance annule tout reçu précédent.</i>", styles['Normal']))
        else:
            content.append(Paragraph("<i>Merci de procéder au règlement avant la date d'échéance.</i>", styles['Normal']))
            
        content.append(Spacer(1, 1*cm))
        content.append(Paragraph(f"Document généré le : {timezone.now().strftime('%d/%m/%Y %H:%M')}", styles['Normal']))
        
        doc.build(content)
        buffer.seek(0)
        return buffer

    @staticmethod
    def generate_lease_invoice_pdf(demande, loyer_hc, charges, caution_mois, avance_mois, frais_assistance, total_a_payer):
        """
        Génère une facture professionnelle PDF pour une demande de location acceptée.
        Retourne un objet BytesIO contenant le PDF.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=20,
            alignment=1,
            spaceAfter=20,
            textColor=colors.darkblue
        )

        content = []

        # En-tête
        content.append(Paragraph("<b>FACTURE DE LOCATION</b>", title_style))
        content.append(Paragraph(f"Référence : {demande.bien.reference}", styles['Normal']))
        content.append(Spacer(1, 0.5*cm))

        # Calcul des totaux
        total_caution = loyer_hc * caution_mois
        total_avance = loyer_hc * avance_mois
        total_loyer_charges = loyer_hc + charges

        # Infos Locataire
        locataire = demande.demandeur
        locataire_text = f"""
        <b>Locataire :</b><br/>
        Nom : {locataire.first_name} {locataire.last_name}<br/>
        Email : {locataire.email}<br/>
        Téléphone : {locataire.telephone or 'N/A'}
        """
        content.append(Paragraph(locataire_text, styles['Normal']))
        content.append(Spacer(1, 0.5*cm))

        # Infos Propriétaire
        proprietaire = demande.proprietaire
        proprietaire_text = f"""
        <b>Propriétaire :</b><br/>
        Nom : {proprietaire.first_name} {proprietaire.last_name}<br/>
        Email : {proprietaire.email}
        """
        content.append(Paragraph(proprietaire_text, styles['Normal']))
        content.append(Spacer(1, 0.5*cm))

        # Le Bien
        bien = demande.bien
        type_bien = getattr(bien, 'sous_type', None)
        type_bien_label = type_bien.nom if type_bien else (bien.categorie.nom if getattr(bien, 'categorie', None) else 'Bien immobilier')
        bien_text = f"""
        <b>Bien loué :</b><br/>
        Type : {type_bien_label}<br/>
        Adresse : {bien.adresse}, {bien.ville}<br/>
        Référence : {bien.reference}
        """
        content.append(Paragraph(bien_text, styles['Normal']))
        content.append(Spacer(1, 0.5*cm))

        # Période de location
        periode_text = f"""
        <b>Période de location :</b><br/>
        Du : {demande.date_debut.strftime('%d/%m/%Y') if demande.date_debut else 'N/A'}<br/>
        Au : {demande.date_fin.strftime('%d/%m/%Y') if demande.date_fin else 'N/A'}<br/>
        Durée : {demande.duree_mois or 0} mois
        """
        content.append(Paragraph(periode_text, styles['Normal']))
        content.append(Spacer(1, 1*cm))

        # Détails de facturation
        content.append(Paragraph("<b>DÉTAIL DE LA FACTURATION</b>", styles['Heading2']))
        content.append(Spacer(1, 0.3*cm))

        data = [
            ["Désignation", "Montant (FCFA)"],
            ["Loyer mensuel Hors Charges", f"{loyer_hc:,.0f}"],
            ["Charges mensuelles", f"{charges:,.0f}"],
            [f"Caution ({caution_mois} mois)", f"{total_caution:,.0f}"],
            [f"Avance ({avance_mois} mois)", f"{total_avance:,.0f}"],
            ["Frais d'assistance", f"{frais_assistance:,.0f}"],
            ["Loyer 1er mois (HC + Charges)", f"{total_loyer_charges:,.0f}"],
            ["<b>TOTAL À PAYER</b>", f"<b>{total_a_payer:,.0f}</b>"],
        ]

        table = Table(data, colWidths=[11*cm, 5*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
        ]))
        content.append(table)
        content.append(Spacer(1, 1*cm))

        # Instructions de paiement
        content.append(Paragraph("<b>INSTRUCTIONS DE PAIEMENT</b>", styles['Heading2']))
        content.append(Spacer(1, 0.3*cm))
        content.append(Paragraph("""
        <i>
        Veuillez effectuer le paiement avant la date d'échéance.<br/>
        Modes de paiement acceptés : Mobile Money (Orange Money, MTN Mobile Money, Moov Money) ou Virement Bancaire.<br/>
        Un accusé de réception vous sera envoyé après confirmation du paiement.
        </i>
        """, styles['Normal']))
        content.append(Spacer(1, 1*cm))

        # Date de génération
        content.append(Paragraph(f"Document généré le : {timezone.now().strftime('%d/%m/%Y à %H:%M')}", styles['Normal']))

        doc.build(content)
        buffer.seek(0)
        return buffer

    @staticmethod
    def generate_payment_receipt_pdf(demande, total_a_payer, mode_paiement="Mobile Money"):
        """
        Génère un reçu de paiement PDF après confirmation du paiement.
        Retourne un objet BytesIO contenant le PDF.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=22,
            alignment=1,
            spaceAfter=20,
            textColor=colors.darkgreen
        )

        content = []

        # En-tête avec checkmark
        content.append(Paragraph("<b>REÇU DE PAIEMENT</b>", title_style))
        content.append(Paragraph("<b style='color: green;'>✓ PAIEMENT CONFIRMÉ</b>", 
            ParagraphStyle('SubtitleStyle', parent=styles['Heading2'], alignment=1, fontSize=14)))
        content.append(Spacer(1, 0.5*cm))

        # Numéro de reçu
        import hashlib
        receipt_number = hashlib.sha256(f"{demande.id}-{timezone.now().isoformat()}".encode()).hexdigest()[:12].upper()
        content.append(Paragraph(f"<b>Numéro de reçu :</b> {receipt_number}", styles['Normal']))
        content.append(Paragraph(f"<b>Date du paiement :</b> {timezone.now().strftime('%d/%m/%Y à %H:%M')}", styles['Normal']))
        content.append(Spacer(1, 0.5*cm))

        # Infos Locataire
        locataire = demande.demandeur
        locataire_text = f"""
        <b>Locataire :</b><br/>
        Nom : {locataire.first_name} {locataire.last_name}<br/>
        Email : {locataire.email}<br/>
        Téléphone : {locataire.telephone or 'N/A'}
        """
        content.append(Paragraph(locataire_text, styles['Normal']))
        content.append(Spacer(1, 0.5*cm))

        # Infos Propriétaire
        proprietaire = demande.proprietaire
        proprietaire_text = f"""
        <b>Propriétaire :</b><br/>
        Nom : {proprietaire.first_name} {proprietaire.last_name}<br/>
        Email : {proprietaire.email}
        """
        content.append(Paragraph(proprietaire_text, styles['Normal']))
        content.append(Spacer(1, 0.5*cm))

        # Le Bien
        bien = demande.bien
        type_bien = getattr(bien, 'sous_type', None)
        type_bien_label = type_bien.nom if type_bien else (bien.categorie.nom if getattr(bien, 'categorie', None) else 'Bien immobilier')
        bien_text = f"""
        <b>Bien loué :</b><br/>
        Type : {type_bien_label}<br/>
        Adresse : {bien.adresse}, {bien.ville}<br/>
        Référence : {bien.reference}
        """
        content.append(Paragraph(bien_text, styles['Normal']))
        content.append(Spacer(1, 0.5*cm))

        # Période de location
        periode_text = f"""
        <b>Période de location :</b><br/>
        Du : {demande.date_debut.strftime('%d/%m/%Y') if demande.date_debut else 'N/A'}<br/>
        Au : {demande.date_fin.strftime('%d/%m/%Y') if demande.date_fin else 'N/A'}<br/>
        Durée : {demande.duree_mois or 0} mois
        """
        content.append(Paragraph(periode_text, styles['Normal']))
        content.append(Spacer(1, 1*cm))

        # Détails du paiement
        content.append(Paragraph("<b style='color: green;'>DÉTAIL DU PAIEMENT</b>", styles['Heading2']))
        content.append(Spacer(1, 0.3*cm))

        # Calculer les montants
        loyer_hc = float(bien.loyer_hc) if bien.loyer_hc else 0
        charges = float(bien.charges) if bien.charges else 0
        caution_mois = bien.caution_mois or 1
        avance_mois = bien.avance_mois or 1
        frais_assistance = float(bien.frais_assistance) if bien.frais_assistance else 0

        total_caution = loyer_hc * caution_mois
        total_avance = loyer_hc * avance_mois
        total_loyer_charges = loyer_hc + charges

        data = [
            ["Désignation", "Montant (FCFA)"],
            ["Loyer mensuel Hors Charges", f"{loyer_hc:,.0f}"],
            ["Charges mensuelles", f"{charges:,.0f}"],
            [f"Caution ({caution_mois} mois)", f"{total_caution:,.0f}"],
            [f"Avance ({avance_mois} mois)", f"{total_avance:,.0f}"],
            ["Frais d'assistance", f"{frais_assistance:,.0f}"],
            ["Loyer 1er mois (HC + Charges)", f"{total_loyer_charges:,.0f}"],
            ["<b>TOTAL PAYÉ</b>", f"<b style='color: green;'>{total_a_payer:,.0f}</b>"],
        ]

        table = Table(data, colWidths=[11*cm, 5*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkgreen),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, -1), (-1, -1), colors.lightgreen),
        ]))
        content.append(table)
        content.append(Spacer(1, 1*cm))

        # Mode de paiement
        content.append(Paragraph(f"<b>Mode de paiement :</b> {mode_paiement}", styles['Normal']))
        content.append(Spacer(1, 0.5*cm))

        # Message de confirmation
        content.append(Paragraph("<b>STATUT</b>", styles['Heading2']))
        content.append(Spacer(1, 0.2*cm))
        content.append(Paragraph(
            "<b style='color: green; font-size: 16px;'>✓ PAIEMENT CONFIRMÉ ET ENREGISTRÉ</b>",
            ParagraphStyle('ConfirmStyle', parent=styles['Normal'], fontSize=14, textColor=colors.darkgreen)
        ))
        content.append(Spacer(1, 1*cm))

        # Instructions
        content.append(Paragraph("<b>PROCHAINES ÉTAPES</b>", styles['Heading2']))
        content.append(Spacer(1, 0.2*cm))
        content.append(Paragraph("""
        <i>
        Votre paiement a été confirmé avec succès.<br/>
        Le propriétaire va maintenant finaliser votre contrat de bail.<br/>
        Vous recevrez le bail signé par email dans les prochains jours.
        </i>
        """, styles['Normal']))
        content.append(Spacer(1, 1*cm))

        # Date de génération
        content.append(Paragraph(f"Reçu généré le : {timezone.now().strftime('%d/%m/%Y à %H:%M')}", styles['Normal']))

        doc.build(content)
        buffer.seek(0)
        return buffer
