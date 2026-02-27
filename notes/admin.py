from django.contrib import admin
from .models import Category, Note, ChecklistItem, NoteImage

admin.site.register(Category)
admin.site.register(Note)
admin.site.register(ChecklistItem)
admin.site.register(NoteImage)