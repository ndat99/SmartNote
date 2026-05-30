from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.template.loader import render_to_string
from datetime import timedelta
from notes.models import Note, Category, ChecklistItem, NoteImage
from django.db.models import Prefetch, Q
from django.utils import timezone
import json

def toggle_pin_note(request, note_id):
    note = get_object_or_404(Note, id=note_id, user=request.user)
    note.is_pinned = not note.is_pinned
    note.save(update_fields=['is_pinned'])
    if request.method == 'POST':
        return JsonResponse({'ok': True, 'is_pinned': note.is_pinned})
    return redirect('home')


# ──────────────────────────────────────────────
#  IMAGE ENDPOINTS
# ──────────────────────────────────────────────


def toggle_archive_note(request, note_id):
    note = get_object_or_404(Note, id=note_id, user=request.user)
    note.is_archived = not note.is_archived
    note.save(update_fields=['is_archived'])
    return redirect(request.META.get('HTTP_REFERER', 'home'))


def set_note_color(request, note_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    note = get_object_or_404(Note, id=note_id, user=request.user)

    try:
        data  = json.loads(request.body)
        color = data.get('color', '')
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    VALID_COLORS = {'', 'berry', 'red', 'orange', 'yellow', 'teal', 'blue', 'indigo', 'purple', 'pink', 'brown'}
    if color not in VALID_COLORS:
        return JsonResponse({'error': 'Invalid color'}, status=400)

    note.background_color = color
    note.save(update_fields=['background_color'])
    return JsonResponse({'ok': True, 'color': color})
