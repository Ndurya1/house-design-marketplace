from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied
from django.http import FileResponse, Http404
from django.urls import path, reverse
from django.utils.html import format_html
from rest_framework.exceptions import ValidationError
from users.operations import require_operator
from .models import Catalogue, Category
from .services import review_listing


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'group', 'is_active']
    list_filter = ['group', 'is_active']
    search_fields = ['name']


@admin.register(Catalogue)
class CatalogueAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'category', 'status', 'price', 'seller', 'created_at']
    list_filter = ['status', 'category__group', 'category', 'seller__user__is_active']
    search_fields = ['title', 'category__name', 'seller__user__name', 'seller__user__email']
    list_select_related = ['seller__user', 'category']
    readonly_fields = ['status', 'review_pdf', 'created_at', 'updated_at']
    exclude = ['plan_file']
    actions = ['publish_selected', 'return_selected_to_draft']

    def has_add_permission(self, request):
        # Listings originate from the designer workflow.
        return False

    def get_readonly_fields(self, request, obj=None):
        if obj and obj.status != Catalogue.ListingStatus.DRAFT:
            return [field.name for field in self.model._meta.fields if field.name != 'plan_file'] + ['review_pdf']
        return super().get_readonly_fields(request, obj)

    def _review(self, request, queryset, publish):
        require_operator(request.user)
        if not self.has_change_permission(request):
            raise PermissionDenied
        for listing in queryset.order_by('pk'):
            try:
                review_listing(actor=request.user, listing_id=listing.pk, publish=publish)
            except ValidationError as exc:
                self.message_user(request, f'{listing.title}: {exc.detail}', messages.ERROR)
            else:
                self.message_user(request, f'{listing.title}: status updated.', messages.SUCCESS)

    @admin.action(description='Publish reviewed listings', permissions=['change'])
    def publish_selected(self, request, queryset):
        self._review(request, queryset, True)

    @admin.action(description='Return listings to draft', permissions=['change'])
    def return_selected_to_draft(self, request, queryset):
        self._review(request, queryset, False)

    def get_urls(self):
        return [path('<int:object_id>/review-pdf/', self.admin_site.admin_view(self.download_pdf),
                     name='catalogue_catalogue_review_pdf')] + super().get_urls()

    @admin.display(description='Plan PDF')
    def review_pdf(self, obj):
        if not obj or not obj.plan_file:
            return 'No PDF attached'
        return format_html('<a href="{}">Download PDF for review</a>',
                           reverse('admin:catalogue_catalogue_review_pdf', args=[obj.pk]))

    def download_pdf(self, request, object_id):
        obj = self.get_object(request, object_id)
        if obj is None:
            raise Http404
        if not self.has_view_permission(request, obj):
            raise PermissionDenied
        if not obj.plan_file:
            raise Http404('No PDF attached.')
        try:
            file = obj.plan_file.open('rb')
        except FileNotFoundError:
            raise Http404('The PDF is unavailable.')
        response = FileResponse(file, as_attachment=True, filename=f'plan-{obj.pk}.pdf', content_type='application/pdf')
        response['Cache-Control'] = 'private, no-store'
        response['X-Content-Type-Options'] = 'nosniff'
        return response
