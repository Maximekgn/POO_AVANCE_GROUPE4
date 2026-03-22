"""
URL configuration for core project.
Toutes les routes API sont préfixées par /api/.
"""

from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Redirige la racine vers l'index de l'API
    path('', RedirectView.as_view(pattern_name='immobilier:api-root', permanent=False)),

    # Interface d'administration Django
    path('admin/', admin.site.urls),

    # ── API ImmobilierPro ──────────────────────────────────────────────────────
    # Toutes les routes de l'app immobilier sont accessibles sous /api/
    # Ex: POST /api/auth/register, POST /api/auth/login, etc.
    path('api/', include('immobilier.urls', namespace='immobilier')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
