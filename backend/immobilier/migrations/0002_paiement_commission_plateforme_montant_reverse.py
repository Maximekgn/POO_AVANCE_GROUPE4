# Generated migration for commission tracking

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('immobilier', '0001_initial'),  # À adapter selon votre dernière migration
    ]

    operations = [
        migrations.AddField(
            model_name='paiement',
            name='commission_plateforme',
            field=models.DecimalField(
                max_digits=10,
                decimal_places=2,
                default=0,
                help_text="Commission de 5% retenue par la plateforme"
            ),
        ),
        migrations.AddField(
            model_name='paiement',
            name='montant_reverse',
            field=models.DecimalField(
                max_digits=10,
                decimal_places=2,
                null=True,
                blank=True,
                help_text="Montant reversé au propriétaire (montant - commission)"
            ),
        ),
    ]
