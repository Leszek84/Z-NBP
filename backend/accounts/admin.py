from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    model = User
    list_display = (
        "id",
        "username",
        "email",
        "is_active",
        "is_staff",
        "date_joined",
    )
    search_fields = ("username", "email", "first_name", "last_name")
