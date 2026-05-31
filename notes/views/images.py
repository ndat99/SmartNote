from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.template.loader import render_to_string
from datetime import timedelta
from notes.models import Note, Category, ChecklistItem, NoteImage
from django.db.models import Prefetch, Q
from django.utils import timezone
import json

def add_note_images(request, note_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
        
    note = get_object_or_404(Note, id=note_id, user=request.user)
    images = request.FILES.getlist('images')
    uploaded_data = []
    for img in images:
        n_img = NoteImage.objects.create(note=note, image=img)
        uploaded_data.append({'id': n_img.id, 'url': n_img.image.url})
        
    return JsonResponse({'ok': True, 'images': uploaded_data})


def delete_note_image(request, image_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
        
    img = get_object_or_404(NoteImage, id=image_id, note__user=request.user)
    img_id = img.id
    img.delete()
    return JsonResponse({'ok': True, 'deleted_id': img_id})


# ──────────────────────────────────────────────
#  TRASH
# ──────────────────────────────────────────────
