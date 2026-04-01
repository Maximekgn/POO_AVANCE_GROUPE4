from django.core.management.base import BaseCommand
from immobilier.models import Utilisateur


class Command(BaseCommand):
    help = "Met à jour les mots de passe des utilisateurs seed vers 'password'"

    def handle(self, *args, **options):
        users = [
            ("kogonmaxime@gmail.com", "Admin"),
            ("kogonmaxime+0@gmail.com", "Client"),
            ("kogonmaxime+1@gmail.com", "Proprio"),
        ]

        for email, role in users:
            try:
                user = Utilisateur.objects.get(email=email)
                user.set_password("password")
                user.save()
                self.stdout.write(self.style.SUCCESS(f"✓ {role} ({email}) - mot de passe mis à jour"))
            except Utilisateur.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"✗ {role} ({email}) - utilisateur non trouvé"))

        self.stdout.write(self.style.SUCCESS("\nTous les mots de passe sont maintenant : password"))
