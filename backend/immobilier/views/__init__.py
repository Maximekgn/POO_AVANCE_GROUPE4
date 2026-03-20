from .auth_views import RegisterView, VerifyEmailView, ResendVerificationView, LoginView, UploadDocumentsView
from .category_views import (
	CategorieBienListCreateView,
	CategorieBienDetailView,
	SousTypeBienListCreateView,
	SousTypeBienDetailView,
)
from .property_views import (
	BienListCreateView,
	BienDetailView,
	BienStatutUpdateView,
	BienActivationUpdateView,
	BienRefusView,
	PublicBienListView,
	PublicBienDetailView,
)
from .photo_views import BienPhotoListCreateView, PhotoDetailView, BienPhotoReorderView

__all__ = [
	'RegisterView',
	'LoginView',
	'UploadDocumentsView',
	'VerifyEmailView',
	'ResendVerificationView',
	'CategorieBienListCreateView',
	'CategorieBienDetailView',
	'SousTypeBienListCreateView',
	'SousTypeBienDetailView',
	'BienListCreateView',
	'PublicBienListView',
	'PublicBienDetailView',
	'BienDetailView',
	'BienStatutUpdateView',
	'BienActivationUpdateView',
	'BienRefusView',
	'BienPhotoListCreateView',
	'BienPhotoReorderView',
	'PhotoDetailView',
]
