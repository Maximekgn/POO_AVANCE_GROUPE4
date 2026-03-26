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
        bien_text = f"<b>Bien loué :</b> {bien.type_bien} - {bien.ville}, {bien.quartier or ''}"
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
