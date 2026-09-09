from rest_framework.routers import DefaultRouter
from .views import CatalogueViewSet, CategoryViewSet

router = DefaultRouter()
router.register(r'catalogue', CatalogueViewSet, basename='catalogue')
router.register(r'categories', CategoryViewSet, basename='category')
urlpatterns = router.urls
