from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from .models import Orders, OrderItem, payments, OrderFileSnapshot, DownloadGrant


class ReadOnlyHistoryAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    fields = ['title_snapshot', 'seller_name_snapshot', 'unit_price']
    readonly_fields = fields
    extra = 0
    can_delete = False
    show_change_link = True

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Orders)
class OrdersAdmin(ReadOnlyHistoryAdmin):
    list_display = ['reference', 'status', 'guest_email', 'total', 'currency', 'is_legacy', 'created_at']
    list_filter = ['status', 'is_legacy']
    search_fields = ['guest_email', 'guest_phone', 'reference']
    date_hierarchy = 'created_at'
    inlines = [OrderItemInline]
    readonly_fields = ['payment_history']

    @admin.display(description='Payment attempts')
    def payment_history(self, obj):
        return format_html('<a href="{}?order__id__exact={}">View payment attempts</a>',
                           reverse('admin:payments_paymentattempt_changelist'), obj.pk)



@admin.register(OrderItem)
class OrderItemAdmin(ReadOnlyHistoryAdmin):
    list_display = ['order', 'title_snapshot', 'seller_name_snapshot', 'unit_price']
    search_fields = ['title_snapshot', 'seller_name_snapshot', 'order__reference']
    list_filter = ['order__status']
    list_select_related = ['order']


@admin.register(payments)
class PaymentsAdmin(ReadOnlyHistoryAdmin):
    list_display = ['id', 'orders', 'payment_method']
    list_filter = ['payment_method']


@admin.register(OrderFileSnapshot)
class SnapshotAdmin(ReadOnlyHistoryAdmin):
    exclude = ['file']
    list_display = ['order_item', 'sha256', 'created_at']


@admin.register(DownloadGrant)
class GrantAdmin(ReadOnlyHistoryAdmin):
    list_display = ['reference', 'payment', 'revoked_at', 'created_at']
