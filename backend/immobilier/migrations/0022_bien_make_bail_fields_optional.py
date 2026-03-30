# Generated manually to make bail fields optional on Bien model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('immobilier', '0021_merge'),
    ]

    operations = [
        migrations.AlterField(
            model_name='bien',
            name='caution_mois',
            field=models.PositiveIntegerField(blank=True, default=0, null=True),
        ),
        migrations.AlterField(
            model_name='bien',
            name='avance_mois',
            field=models.PositiveIntegerField(blank=True, default=0, null=True),
        ),
        migrations.AlterField(
            model_name='bien',
            name='frais_assistance',
            field=models.DecimalField(blank=True, decimal_places=2, default=0.0, max_digits=10, null=True),
        ),
    ]
