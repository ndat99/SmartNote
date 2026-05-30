from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.template.loader import render_to_string
from datetime import timedelta
from notes.models import Note, Category, ChecklistItem, NoteImage
from django.db.models import Prefetch, Q
from django.utils import timezone
import json

import threading
from .ai_views import run_ai_background

def create_checklist(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    title = data.get('title', '').strip()
    items = [i for i in data.get('items', []) if i.strip()]
    color = data.get('color', '')
    reminder_at_str = data.get('reminder_at', '')

    if not title and not items:
        return JsonResponse({'ok': True, 'skipped': True})

    VALID_COLORS = {'', 'berry', 'red', 'orange', 'yellow', 'teal', 'blue', 'indigo', 'purple', 'pink', 'brown'}
    if color not in VALID_COLORS:
        color = ''

    # Parse reminder_at nếu có
    reminder_at = None
    if reminder_at_str:
        from django.utils.dateparse import parse_datetime
        from zoneinfo import ZoneInfo
        dt = parse_datetime(reminder_at_str)
        if dt:
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=ZoneInfo('Asia/Ho_Chi_Minh'))
            reminder_at = dt

    note = Note.objects.create(
        user=request.user,
        title=title,
        note_type='checklist',
        background_color=color,
        reminder_at=reminder_at,
    )

    for i, text in enumerate(items):
        ChecklistItem.objects.create(note=note, content=text, position=i)

    items_text = ' '.join(items)
    thread = threading.Thread(target=run_ai_background, args=(note.id, title, items_text))
    thread.start()

    # Render card HTML để client inject trực tiếp, tránh reload trang
    note_refreshed = Note.objects.prefetch_related(
        Prefetch('checklists', queryset=ChecklistItem.objects.order_by('position'))
    ).get(id=note.id)
    card_html = render_to_string(
        'notes/components/_note_card.html',
        {'note': note_refreshed, 'card_index': 0},
        request=request,
    )
    return JsonResponse({'ok': True, 'note_id': note.id, 'card_html': card_html})


def toggle_checklist_item(request, item_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    item = get_object_or_404(ChecklistItem, id=item_id, note__user=request.user)
    item.is_checked = not item.is_checked
    item.save(update_fields=['is_checked'])
    return JsonResponse({'ok': True, 'is_checked': item.is_checked})


def delete_checklist_item(request, item_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    item = get_object_or_404(ChecklistItem, id=item_id, note__user=request.user)
    item.delete()
    return JsonResponse({'ok': True})


def add_checklist_item(request, note_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    note = get_object_or_404(Note, id=note_id, user=request.user, note_type='checklist')

    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    content = data.get('content', '').strip()
    if not content:
        return JsonResponse({'error': 'Empty content'}, status=400)

    max_pos = note.checklists.count()
    item    = ChecklistItem.objects.create(note=note, content=content, position=max_pos)
    return JsonResponse({'ok': True, 'item_id': item.id, 'position': item.position})


def reorder_checklist_items(request, note_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    note = get_object_or_404(Note, id=note_id, user=request.user)

    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    order = data.get('order', [])
    if order:
        items_map = {
            item.id: item
            for item in ChecklistItem.objects.filter(note=note, id__in=order)
        }
        to_update = []
        for i, item_id in enumerate(order):
            item = items_map.get(int(item_id))
            if item:
                item.position = i
                to_update.append(item)
        if to_update:
            ChecklistItem.objects.bulk_update(to_update, ['position'])
    return JsonResponse({'ok': True})
