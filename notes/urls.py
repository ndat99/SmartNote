from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('delete/<int:note_id>/', views.delete_note, name='delete_note'),
    path('restore/<int:note_id>/', views.restore_note, name='restore_note'),
    path('hard-delete/<int:note_id>/', views.hard_delete_note, name='hard_delete_note'),
    path('pin/<int:note_id>/', views.toggle_pin_note, name='toggle_pin_note'),
    path('set-color/<int:note_id>/', views.set_note_color, name='set_note_color'),
    path('update/<int:note_id>/', views.update_note, name='update_note'),

    path('trash/', views.trash, name='trash'),

    path('archive/', views.archive, name='archive'),
    path('archive/<int:note_id>/', views.toggle_archive_note, name='toggle_archive_note'),

    # Checklist endpoints
    path('checklist/create/', views.create_checklist, name='create_checklist'),
    path('checklist/item/toggle/<int:item_id>/', views.toggle_checklist_item, name='toggle_checklist_item'),
    path('checklist/item/delete/<int:item_id>/', views.delete_checklist_item, name='delete_checklist_item'),
    path('checklist/item/add/<int:note_id>/', views.add_checklist_item, name='add_checklist_item'),
    path('checklist/item/reorder/<int:note_id>/', views.reorder_checklist_items, name='reorder_checklist_items'),
]