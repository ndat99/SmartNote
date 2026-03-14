from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from datetime import timedelta
from .models import Note, Category, ChecklistItem
from django.db.models import Prefetch
from django.utils import timezone
import threading
import json

try:
    from .ai_helper import analyze_note_with_ai
except ImportError:
    def analyze_note_with_ai(text):
        return None


def run_ai_background(note_id, text):
    try:
        ai_result = analyze_note_with_ai(text)
        print("AI RESULT: ", ai_result)
        if ai_result:
            note = Note.objects.get(id=note_id)

            note.is_task = ai_result.get('is_task')
            note.is_task_source = 'AI'

            note.priority = ai_result.get('priority')
            note.priority_source = 'AI'

            cat_name = ai_result.get('category')
            if cat_name:
                cat_name = cat_name.strip()
                category_obj = Category.objects.filter(name__iexact=cat_name, user__isnull=True).first()
                if not category_obj:
                    category_obj = Category.objects.filter(name__iexact=cat_name, user=note.user).first()
                if not category_obj:
                    category_obj = Category.objects.create(name=cat_name.capitalize(), user=note.user)
                note.category = category_obj

            due_date_str = ai_result.get('due_date')
            if due_date_str:
                try:
                    note.due_date = due_date_str
                    note.due_date_source = 'AI'
                except Exception:
                    pass

            note.save()
            print(f"[AI] Đã phân tích xong Note ID {note_id}")
    except Exception as e:
        print(f"[AI LỖI] {e}")


def _checklist_prefetch():
    return Prefetch('checklists', queryset=ChecklistItem.objects.order_by('position'))


def home(request):
    if not request.user.is_authenticated:
        return render(request, 'notes/home.html', {'notes': []})

    # Auto-clean trash older than 7 days
    seven_days_ago = timezone.now() - timedelta(days=7)
    Note.objects.filter(user=request.user, is_deleted=True, deleted_at__lte=seven_days_ago).delete()

    if request.method == 'POST':
        title = request.POST.get('title', '')
        content = request.POST.get('content', '')

        if title.strip() or content.strip():
            note = Note.objects.create(
                user=request.user,
                title=title,
                content=content,
            )
            text_to_analyze = f"{title}. {content}"
            thread = threading.Thread(target=run_ai_background, args=(note.id, text_to_analyze))
            thread.start()

        return redirect('home')

    notes = Note.objects.filter(
        user=request.user, is_deleted=False, is_pinned=False
    ).prefetch_related(_checklist_prefetch()).order_by('-created_at')

    pinned_notes = Note.objects.filter(
        user=request.user, is_deleted=False, is_pinned=True
    ).prefetch_related(_checklist_prefetch()).order_by('-created_at')

    return render(request, 'notes/home.html', {'notes': notes, 'pinned_notes': pinned_notes})


# ──────────────────────────────────────────────
#  CHECKLIST ENDPOINTS
# ──────────────────────────────────────────────

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

    if not title and not items:
        return JsonResponse({'ok': True, 'skipped': True})

    VALID_COLORS = {'', 'berry', 'red', 'orange', 'yellow', 'teal', 'blue', 'indigo', 'purple', 'pink', 'brown'}
    if color not in VALID_COLORS:
        color = ''

    note = Note.objects.create(
        user=request.user,
        title=title,
        note_type='checklist',
        background_color=color,
    )

    for i, text in enumerate(items):
        ChecklistItem.objects.create(note=note, content=text, position=i)

    # AI analysis (title + items as text)
    text_to_analyze = f"{title}. {' '.join(items)}"
    thread = threading.Thread(target=run_ai_background, args=(note.id, text_to_analyze))
    thread.start()

    return JsonResponse({'ok': True, 'note_id': note.id})


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
    item = ChecklistItem.objects.create(note=note, content=content, position=max_pos)
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

    order = data.get('order', [])  # list of item IDs in new order
    for i, item_id in enumerate(order):
        ChecklistItem.objects.filter(id=item_id, note=note).update(position=i)

    return JsonResponse({'ok': True})


# ──────────────────────────────────────────────
#  EXISTING ENDPOINTS (unchanged)
# ──────────────────────────────────────────────

def delete_note(request, note_id):
    note = get_object_or_404(Note, id=note_id, user=request.user)
    note.is_deleted = True
    note.deleted_at = timezone.now()
    note.save()
    return redirect('home')


def trash(request):
    if not request.user.is_authenticated:
        return redirect('home')
    deleted_note = Note.objects.filter(user=request.user, is_deleted=True).order_by('-deleted_at')
    return render(request, 'notes/trash.html', {'notes': deleted_note})


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


def toggle_pin_note(request, note_id):
    note = get_object_or_404(Note, id=note_id, user=request.user)
    note.is_pinned = not note.is_pinned
    note.save()
    return redirect('home')


def set_note_color(request, note_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    note = get_object_or_404(Note, id=note_id, user=request.user)

    try:
        data = json.loads(request.body)
        color = data.get('color', '')
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    VALID_COLORS = {'', 'berry', 'red', 'orange', 'yellow', 'teal', 'blue', 'indigo', 'purple', 'pink', 'brown'}
    if color not in VALID_COLORS:
        return JsonResponse({'error': 'Invalid color'}, status=400)

    note.background_color = color
    note.save(update_fields=['background_color'])
    return JsonResponse({'ok': True, 'color': color})

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

    title   = data.get('title',   note.title)
    content = data.get('content', note.content)

    note.title   = title
    note.content = content
    note.save(update_fields=['title', 'content', 'updated_at'])

    return JsonResponse({'ok': True})