from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('notes.urls')), # Đặt toàn bộ đường dẫn của app notes vào đây
    path('accounts/', include('allauth.urls')), # Bật đường dẫn cho Google Login của Allauth
]