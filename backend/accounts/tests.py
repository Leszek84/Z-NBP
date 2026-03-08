from typing import cast

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from .models import User


class AuthApiTests(APITestCase):
    def setUp(self):
        self.register_url = reverse("accounts:register")
        self.login_url = reverse("accounts:login")
        self.logout_url = reverse("accounts:logout")
        self.me_url = reverse("accounts:me")
        self.refresh_url = reverse("accounts:token_refresh")

    def _create_user(
        self, username="alice", email="alice@example.com", password="StrongPass123!"
    ):
        return User.objects.create_user(
            username=username, email=email, password=password
        )

    def _authenticate(self, user, password="StrongPass123!"):
        response = self.client.post(
            self.login_url,
            {"username_email": user.email, "password": password},
            format="json",
        )
        tokens = response.json()
        api_client = cast(APIClient, self.client)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access_token']}")
        return tokens

    def test_health_endpoint(self):
        response = self.client.get(reverse("healthcheck"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_register_then_login_and_refresh(self):
        payload = {
            "username": "alice",
            "email": "ALICE@example.com",
            "password": "StrongPass123!",
        }
        register_response = self.client.post(self.register_url, payload, format="json")

        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        register_json = register_response.json()
        self.assertEqual(register_json["token_type"], "Bearer")
        self.assertIn("access_token", register_json)
        self.assertIn("refresh_token", register_json)
        self.assertEqual(register_json["user"]["email"], "alice@example.com")

        login_response = self.client.post(
            self.login_url,
            {"username_email": "alice@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        login_json = login_response.json()
        self.assertIn("access_token", login_json)

        refresh_response = self.client.post(
            self.refresh_url,
            {"refresh": login_json["refresh_token"]},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_response.json())

    def test_register_rejects_weak_password(self):
        response = self.client.post(
            self.register_url,
            {"username": "weak", "email": "weak@example.com", "password": "12345678"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.json())

    def test_login_with_username_works(self):
        self._create_user(username="bob", email="bob@example.com")
        response = self.client.post(
            self.login_url,
            {"username_email": "bob", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access_token", response.json())

    def test_login_fails_for_nonexistent_user(self):
        response = self.client.post(
            self.login_url,
            {"username_email": "nobody@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.json()["error"], "Invalid credentials.")

    def test_login_fails_for_wrong_password(self):
        self._create_user()
        response = self.client.post(
            self.login_url,
            {"username_email": "alice@example.com", "password": "WrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.json()["error"], "Invalid credentials.")

    def test_login_fails_for_inactive_user(self):
        user = self._create_user()
        user.is_active = False
        user.save(update_fields=["is_active"])

        response = self.client.post(
            self.login_url,
            {"username_email": "alice@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.json()["error"], "Account is disabled.")

    def test_me_requires_auth(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_get_and_patch_for_authenticated_user(self):
        user = self._create_user()
        self._authenticate(user)

        get_response = self.client.get(self.me_url)
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertEqual(get_response.json()["email"], "alice@example.com")

        patch_response = self.client.patch(
            self.me_url,
            {"first_name": "Alice", "last_name": "Smith"},
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.json()["first_name"], "Alice")
        self.assertEqual(patch_response.json()["full_name"], "Alice Smith")

    def test_me_delete_removes_current_user(self):
        user = self._create_user()
        self._authenticate(user)

        response = self.client.delete(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=user.pk).exists())

    def test_logout_requires_auth(self):
        response = self.client.post(self.logout_url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_requires_refresh_token_payload(self):
        user = self._create_user()
        self._authenticate(user)

        response = self.client.post(self.logout_url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["error"], "Refresh token is required.")

    def test_logout_rejects_invalid_refresh_token(self):
        user = self._create_user()
        self._authenticate(user)

        response = self.client.post(
            self.logout_url,
            {"refresh": "invalid.token.value"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["error"], "Invalid or expired token.")

    def test_logout_blacklists_valid_refresh_token(self):
        user = self._create_user()
        tokens = self._authenticate(user)

        response = self.client.post(
            self.logout_url,
            {"refresh_token": tokens["refresh_token"]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["message"], "Successfully logged out.")


class UserModelTests(APITestCase):
    def test_user_string_and_full_name_fallback(self):
        user = User.objects.create_user(
            username="charlie",
            email="charlie@example.com",
            password="StrongPass123!",
        )

        self.assertEqual(str(user), "charlie")
        self.assertEqual(user.full_name, "charlie")

        user.first_name = "Charlie"
        user.last_name = "Brown"
        self.assertEqual(user.full_name, "Charlie Brown")
