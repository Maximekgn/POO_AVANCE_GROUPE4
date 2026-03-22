from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('immobilier', '0008_bien_is_active'),
    ]

    operations = [
        migrations.AddField(
            model_name='utilisateur',
            name='photo_profil',
            field=models.URLField(blank=True, null=True),
        ),
    ]
