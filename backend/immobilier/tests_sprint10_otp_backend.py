from unittest.mock import patch

from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from immobilier.models import EmailVerificationOTP, Utilisateur


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class Sprint10BackendOTPTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = 'OtpPass123!'

    def _register_user(self, email='otp-user@example.com', forced_otp_code=None):
        payload = {
            'nom': 'OTP',
            'prenom': 'User',
            'email': email,
            'motDePasse': self.password,
            'telephone': '+22890000000',
        }
        if forced_otp_code:
            with patch('immobilier.views.auth_views._generate_otp_code', return_value=forced_otp_code):
                return self.client.post('/api/auth/register', payload, format='json')
        return self.client.post('/api/auth/register', payload, format='json')

    def test_register_creates_otp_and_sends_verification_email(self):
        response = self._register_user()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data.get('verification_method'), 'otp')

        user = Utilisateur.objects.get(email='otp-user@example.com')
        otp = EmailVerificationOTP.objects.filter(utilisateur=user).order_by('-created_at').first()

        self.assertIsNotNone(otp)
        self.assertFalse(otp.is_used)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Code OTP', mail.outbox[0].subject)

    def test_verify_email_with_valid_otp(self):
        self._register_user(email='valid-otp@example.com', forced_otp_code='123456')
        user = Utilisateur.objects.get(email='valid-otp@example.com')

        otp = EmailVerificationOTP.objects.filter(utilisateur=user).order_by('-created_at').first()
        self.assertIsNotNone(otp)

        response = self.client.post(
            '/api/auth/verify-email',
            {'email': user.email, 'otp_code': '123456'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)

        user.refresh_from_db()
        otp.refresh_from_db()

        self.assertTrue(user.email_verifie)
        self.assertTrue(user.is_active)
        self.assertTrue(otp.is_used)

    def test_verify_email_rejects_invalid_otp_and_increments_attempts(self):
        self._register_user(email='invalid-otp@example.com')
        user = Utilisateur.objects.get(email='invalid-otp@example.com')

        otp = EmailVerificationOTP.objects.filter(utilisateur=user).order_by('-created_at').first()

        response = self.client.post(
            '/api/auth/verify-email',
            {'email': user.email, 'otp_code': '000000'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)

        otp.refresh_from_db()
        self.assertEqual(otp.attempts, 1)

    def test_resend_verification_applies_cooldown(self):
        self._register_user(email='cooldown@example.com')

        response = self.client.post(
            '/api/auth/resend-verification',
            {'email': 'cooldown@example.com'},
            format='json',
        )

        self.assertEqual(response.status_code, 429)
        self.assertIn('Veuillez patienter', response.data.get('error', ''))
