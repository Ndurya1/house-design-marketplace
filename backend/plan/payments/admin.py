from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from urllib.parse import urlencode
from orders.admin import ReadOnlyHistoryAdmin
from .models import PaymentAttempt, PaymentCallbackEvent


@admin.register(PaymentAttempt)
class PaymentAttemptAdmin(ReadOnlyHistoryAdmin):
    list_display = ['reference', 'order', 'status', 'amount', 'receipt_number', 'error_code', 'created_at']
    list_filter = ['status']
    search_fields = ['reference', 'order__reference', 'checkout_request_id', 'merchant_request_id', 'receipt_number']

    date_hierarchy = 'created_at'
    list_select_related = ['order']
    readonly_fields = ['order_history', 'callback_history']

    @admin.display(description='Order')
    def order_history(self, obj):
        return format_html('<a href="{}">View order</a>', reverse('admin:orders_orders_change', args=[obj.order_id]))

    @admin.display(description='Callback evidence')
    def callback_history(self, obj):
        if not obj.checkout_request_id:
            return 'No provider checkout ID recorded; requires investigation.'
        query = urlencode({'checkout_request_id__exact': obj.checkout_request_id})
        return format_html('<a href="{}?{}">View callback evidence</a>',
                           reverse('admin:payments_paymentcallbackevent_changelist'), query)


@admin.register(PaymentCallbackEvent)
class CallbackEventAdmin(ReadOnlyHistoryAdmin):
    list_display = ['id', 'checkout_request_id', 'status', 'result_code', 'error_code', 'created_at']
    list_filter = ['status']

    search_fields = ['checkout_request_id', 'merchant_request_id', 'receipt_number', 'error_code']
    date_hierarchy = 'created_at'
