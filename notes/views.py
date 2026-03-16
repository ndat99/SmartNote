from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.template.loader import render_to_string
from datetime import timedelta
from .models import Note, Category, ChecklistItem
from django.db.models import Prefetch, Q
from django.utils import timezone
import threading
import json
import time

try:
    from .ai_helper import analyze_note_with_ai
except ImportError:
    def analyze_note_with_ai(title, content):
        return None


def run_ai_background(note_id, title, content):
    try:
        ai_result = analyze_note_with_ai(title, content)
        print("AI RESULT: ", ai_result)
        if ai_result:
            note = Note.objects.get(id=note_id)

            note.is_task        = ai_result.get('is_task')
            note.is_task_source = 'AI'
            note.priority       = ai_result.get('priority')
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
                    note.due_date        = due_date_str
                    note.due_date_source = 'AI'
                except Exception:
                    pass

            note.save()
            print(f"[AI] Đã phân tích xong Note ID {note_id}")
    except Exception as e:
        print(f"[AI LỖI] {e}")


def _checklist_prefetch():
    return Prefetch('checklists', queryset=ChecklistItem.objects.order_by('position'))


# ──────────────────────────────────────────────
#  HOME
# ──────────────────────────────────────────────

def home(request):
    if not request.user.is_authenticated:
        return render(request, 'notes/home.html', {'notes': []})

    # Auto-clean trash: tối đa 1 lần/giờ/session, tránh chạy mỗi request
    last_clean = request.session.get('last_trash_clean', 0)
    if time.time() - last_clean > 3600:
        seven_days_ago = timezone.now() - timedelta(days=7)
        Note.objects.filter(user=request.user, is_deleted=True, deleted_at__lte=seven_days_ago).delete()
        request.session['last_trash_clean'] = time.time()

    if request.method == 'POST':
        title            = request.POST.get('title', '')
        content          = request.POST.get('content', '')
        background_color = request.POST.get('background_color', '')

        VALID_COLORS = {'', 'berry', 'red', 'orange', 'yellow', 'teal', 'blue', 'indigo', 'purple', 'pink', 'brown'}
        if background_color not in VALID_COLORS:
            background_color = ''

        if title.strip() or content.strip():
            note = Note.objects.create(
                user=request.user,
                title=title,
                content=content,
                background_color=background_color,
            )
            thread = threading.Thread(target=run_ai_background, args=(note.id, title, content))
            thread.start()

        return redirect('home')

    notes = Note.objects.filter(
        user=request.user, is_deleted=False, is_pinned=False, is_archived=False
    ).prefetch_related(_checklist_prefetch()).order_by('-created_at')

    pinned_notes = Note.objects.filter(
        user=request.user, is_deleted=False, is_pinned=True, is_archived=False
    ).prefetch_related(_checklist_prefetch()).order_by('-created_at')

    return render(request, 'notes/home.html', {'notes': notes, 'pinned_notes': pinned_notes})


# ──────────────────────────────────────────────
#  NOTE ENDPOINTS
# ──────────────────────────────────────────────

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
        'category': {'id': note.category.id, 'name': note.category.name} if note.category else None,
    })


def get_categories(request):
    """Trả về danh sách category: system + của user hiện tại."""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    system_cats = list(Category.objects.filter(user__isnull=True).values('id', 'name'))
    user_cats   = list(Category.objects.filter(user=request.user).values('id', 'name'))

    return JsonResponse({'system': system_cats, 'user': user_cats})


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


def delete_note(request, note_id):
    note = get_object_or_404(Note, id=note_id, user=request.user)
    note.is_deleted = True
    note.deleted_at = timezone.now()
    note.save(update_fields=['is_deleted', 'deleted_at'])
    if request.method == 'POST':
        return JsonResponse({'ok': True})
    return redirect('home')


def toggle_pin_note(request, note_id):
    note = get_object_or_404(Note, id=note_id, user=request.user)
    note.is_pinned = not note.is_pinned
    note.save(update_fields=['is_pinned'])
    if request.method == 'POST':
        return JsonResponse({'ok': True, 'is_pinned': note.is_pinned})
    return redirect('home')


# ──────────────────────────────────────────────
#  TRASH
# ──────────────────────────────────────────────

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


def toggle_archive_note(request, note_id):
    note = get_object_or_404(Note, id=note_id, user=request.user)
    note.is_archived = not note.is_archived
    note.save(update_fields=['is_archived'])
    return redirect(request.META.get('HTTP_REFERER', 'home'))

def archive(request):
    if not request.user.is_authenticated:
        return redirect('home')
    
    archived_notes = Note.objects.filter(
        user=request.user,
        is_archived=True,
        is_deleted=False
    ).prefetch_related(_checklist_prefetch()).order_by('-created_at')

    return render(request, 'notes/archive.html', {'notes': archived_notes})