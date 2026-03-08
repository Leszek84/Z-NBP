from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import (
    RegisterSerializer,
    UserDashboardSerializer,
    UserLoginSerializer,
    UserSerializer,
)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access_token": str(refresh.access_token),
        "refresh_token": str(refresh),
        "token_type": "Bearer",
        "user": UserSerializer(user).data,
    }


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(get_tokens_for_user(user), status=status.HTTP_201_CREATED)


class LoginView(generics.GenericAPIView):
    serializer_class = UserLoginSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username_email = serializer.validated_data["username_email"]
        password = serializer.validated_data["password"]

        try:
            user = User.objects.get(
                Q(username=username_email) | Q(email=username_email)
            )
            if not user.is_active:
                return Response(
                    {"error": "Account is disabled."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if user.check_password(password):
                return Response(get_tokens_for_user(user), status=status.HTTP_200_OK)
        except User.DoesNotExist:
            pass

        return Response(
            {"error": "Invalid credentials."},
            status=status.HTTP_401_UNAUTHORIZED,
        )


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get("refresh") or request.data.get("refresh_token")
        if not refresh_token:
            return Response(
                {"error": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {"message": "Successfully logged out."},
                status=status.HTTP_200_OK,
            )
        except TokenError:
            return Response(
                {"error": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class UserDashboardView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserDashboardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):  # type: ignore[override]
        return self.request.user
