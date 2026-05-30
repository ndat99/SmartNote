from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.template.loader import render_to_string
from datetime import timedelta
from notes.models import Note, Category, ChecklistItem, NoteImage
from django.db.models import Prefetch, Q
from django.utils import timezone
import json

def update_note(request, note_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    note = get_object_or_404(Note, id=note_id, user=request.user)

    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    note.title   = data.get('title',   note.title)
    note.content = data.get('content', note.content)
    note.save(update_fields=['title', 'content', 'updated_at'])

    return JsonResponse({'ok': True})


def update_note_meta(request, note_id):
    """Cập nhật category và/hoặc is_task từ phía user."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    note = get_object_or_404(Note, id=note_id, user=request.user)

    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    update_fields = []

    # ── is_task ──
    if 'is_task' in data:
        note.is_task        = data['is_task']
        note.is_task_source = 'USER'
        update_fields.extend(['is_task', 'is_task_source'])

    # ── priority (user-set) ──
    if 'priority' in data:
        raw = data['priority']
        if raw in ('high', 'medium', 'low'):
            note.priority        = raw
            note.priority_source = 'USER'
        else:
            note.priority        = None
            note.priority_source = None
        update_fields.extend(['priority', 'priority_source'])

    # ── category theo id ──
    if 'category_id' in data:
        cat_id = data['category_id']
        if cat_id is None:
            note.category = None
        else:
            cat = Category.objects.filter(
                id=cat_id
            ).filter(
                Q(user__isnull=True) | Q(user=request.user)
            ).first()
            if cat:
                note.category = cat
        update_fields.append('category')

    # ── tạo category mới ──
    if 'new_category' in data:
        name = data['new_category'].strip()
        if name:
            cat, _ = Category.objects.get_or_create(
                name__iexact=name,
                user=request.user,
                defaults={'name': name.capitalize()}
            )
            note.category = cat
        update_fields.append('category')

    if update_fields:
        note.save(update_fields=update_fields)
    return JsonResponse({
        'ok': True,
        'is_task':        note.is_task,
        'is_task_source': note.is_task_source,
        'priority':       note.priority,
        'category': {'id': note.category.id, 'name': note.category.name} if note.category else None,
    })


def delete_note(request, note_id):
    note = get_object_or_404(Note, id=note_id, user=request.user)
    note.is_deleted = True
    note.deleted_at = timezone.now()
    note.save(update_fields=['is_deleted', 'deleted_at'])
    if request.method == 'POST':
        return JsonResponse({'ok': True})
    return redirect('home')


def restore_note(request, note_id):
    note = get_object_or_404(Note, id=note_id, user=request.user)
    note.is_deleted = False
    note.deleted_at = None
    note.save()
    return redirect('trash')


def hard_delete_note(request, note_id):
    note = get_object_or_404(Note, id=note_id, user=request.user)
    note.delete()
    return redirect('trash')


# ──────────────────────────────────────────────
#  CHECKLIST ENDPOINTS
# ──────────────────────────────────────────────
