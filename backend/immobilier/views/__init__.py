from .auth_views import RegisterView, VerifyEmailView, ResendVerificationView
from .category_views import (
	CategorieBienListCreateView,
	CategorieBienDetailView,
	SousTypeBienListCreateView,
	SousTypeBienDetailView,
)
from .property_views import BienListCreateView, BienDetailView, BienStatutUpdateView
from .photo_views import BienPhotoListCreateView, PhotoDetailView, BienPhotoReorderView

__all__ = [
	'RegisterView',
	'VerifyEmailView',
	'ResendVerificationView',
	'CategorieBienListCreateView',
	'CategorieBienDetailView',
	'SousTypeBienListCreateView',
	'SousTypeBienDetailView',
	'BienListCreateView',
	'BienDetailView',
	'BienStatutUpdateView',
	'BienPhotoListCreateView',
	'BienPhotoReorderView',
	'PhotoDetailView',
]
