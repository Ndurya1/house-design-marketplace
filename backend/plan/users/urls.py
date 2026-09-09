from django.urls import path, include
from .import views
#from rest_framework.routers import DefaultRouter

#router =DefaultRouter()

#router.register(r)
#urlpatterns=router.urls
#path('', include(router.urls));

urlpatterns =[
    path("register/", views.UserRegistrationView.as_view(), name="user-register"),

    path('buyer/', views.BuyerView.as_view(), name='buyer-profile'),
    path('seller/', views.SellerProfileView.as_view(), name='seller-profile'),
    path('seller/<int:pk>/', views.SellerProfileDetailView.as_view(), name='seller-detail'),
    path("login/", views.UserLoginView.as_view(), name="user-login"),
   
]
