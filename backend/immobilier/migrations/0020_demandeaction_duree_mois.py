# Generated manually for Bail demand feature

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('immobilier', '0019_emailverificationotp'),
    ]

    operations = [
        migrations.AlterField(
            model_name='demandeaction',
            name='date_debut',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='demandeaction',
            name='date_fin',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='demandeaction',
            name='duree_mois',
            field=models.PositiveIntegerField(blank=True, null=True, help_text="Durée en mois pour les demandes de bail"),
        ),
    ]
