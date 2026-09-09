from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from .operations import require_operator, set_designer_active
from django.contrib.auth.admin import UserAdmin
from .models import User, Buyer, SellerProfile

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ['email', 'username', 'name', 'role', 'is_active', 'is_staff', 'is_superuser']
    list_filter = ['role', 'is_active', 'is_staff', 'is_superuser']
    actions = ['suspend_designers', 'reactivate_designers']

    def has_add_permission(self, request):
        return request.user.is_superuser and super().has_add_permission(request)

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        operator = request.user.is_superuser or request.user.role == User.UserChoices.ADMIN
        return operator and super().has_change_permission(request, obj)

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if not request.user.is_superuser:
            queryset = queryset.filter(role=User.UserChoices.SELLER, is_staff=False, is_superuser=False)
        return queryset

    def get_readonly_fields(self, request, obj=None):
        if not request.user.is_superuser:
            return ['username', 'email', 'password', 'role', 'is_staff', 'is_superuser',
                    'groups', 'user_permissions', 'is_active']
        return super().get_readonly_fields(request, obj)

    def _set_active(self, request, queryset, active):
        require_operator(request.user)
        if not self.has_change_permission(request):
            raise PermissionDenied
        for designer in queryset.order_by('pk'):
            try:
                set_designer_active(actor=request.user, designer_id=designer.pk, active=active)
            except ValidationError as exc:
                self.message_user(request, f'{designer.email}: {exc.detail}', messages.ERROR)
            else:
                self.message_user(request, f'{designer.email}: account is {"active" if active else "suspended"}.', messages.SUCCESS)

    @admin.action(description='Suspend selected designers', permissions=['change'])
    def suspend_designers(self, request, queryset):
        self._set_active(request, queryset, False)

    @admin.action(description='Reactivate selected designers', permissions=['change'])
    def reactivate_designers(self, request, queryset):
        self._set_active(request, queryset, True)

    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('role', 'name')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('role', 'name')}),
    )

@admin.register(Buyer)
class BuyerAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'phone']
    search_fields = ['user__email', 'user__name', 'phone']

@admin.register(SellerProfile)
class SellerProfileAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'phone']
    search_fields = ['user__email', 'user__name', 'phone']

admin.site.register(User, CustomUserAdmin)
