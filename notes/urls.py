from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('delete/<int:note_id>/', views.delete_note, name='delete_note'),
    path('restore/<int:note_id>/', views.restore_note, name='restore_note'),
    path('hard-delete/<int:note_id>/', views.hard_delete_note, name='hard_delete_note'),
    path('pin/<int:note_id>/', views.toggle_pin_note, name='toggle_pin_note'),


    path('trash/', views.trash, name='trash'),
]