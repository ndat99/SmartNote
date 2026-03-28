from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('notes.urls')), # Đặt toàn bộ đường dẫn của app notes vào đây
    path('accounts/', include('allauth.urls')), # Bật đường dẫn cho Google Login của Allauth
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)