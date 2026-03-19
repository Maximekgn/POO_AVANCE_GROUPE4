from .auth_views import RegisterView, VerifyEmailView, ResendVerificationView
from .category_views import (
	CategorieBienListCreateView,
	CategorieBienDetailView,
	SousTypeBienListCreateView,
	SousTypeBienDetailView,
)

__all__ = [
	'RegisterView',
	'VerifyEmailView',
	'ResendVerificationView',
	'CategorieBienListCreateView',
	'CategorieBienDetailView',
	'SousTypeBienListCreateView',
	'SousTypeBienDetailView',
]
