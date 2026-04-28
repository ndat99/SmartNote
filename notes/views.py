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

def _auto_clean_trash(request):
    """Auto-clean trash: tối đa 1 lần/giờ/session, tránh chạy mỗi request."""
    if not request.user.is_authenticated:
        return
    last_clean = request.session.get('last_trash_clean', 0)
    if time.time() - last_clean > 3600:
        seven_days_ago = timezone.now() - timedelta(days=7)
        Note.objects.filter(user=request.user, is_deleted=True, deleted_at__lte=seven_days_ago).delete()
        request.session['last_trash_clean'] = time.time()

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
                    # Gán cho due_date (trường tham khảo của AI)
                    note.due_date        = due_date_str
                    note.due_date_source = 'AI'

                    # TỰ ĐỘNG ĐẶT LỜI NHẮC: Nếu người dùng chưa đặt (reminder_at is null)
                    if not note.reminder_at:
                        from django.utils.dateparse import parse_datetime
                        from zoneinfo import ZoneInfo
                        dt = parse_datetime(due_date_str)
                        if dt:
                            # Đảm bảo timezone chuẩn
                            if dt.tzinfo is None:
                                dt = dt.replace(tzinfo=ZoneInfo('Asia/Ho_Chi_Minh'))
                            note.reminder_at = dt
                            print(f"[AI] Tự động đặt nhắc nhở cho Note ID {note_id} lúc {due_date_str}")
                except Exception as e:
                    print(f"[AI Lỗi parse date] {e}")

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

    _auto_clean_trash(request)

    if request.method == 'POST':
        title            = request.POST.get('title', '')
        content          = request.POST.get('content', '')
        background_color = request.POST.get('background_color', '')
        reminder_at_str  = request.POST.get('reminder_at', '').strip()

        VALID_COLORS = {'', 'berry', 'red', 'orange', 'yellow', 'teal', 'blue', 'indigo', 'purple', 'pink', 'brown'}
        if background_color not in VALID_COLORS:
            background_color = ''

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

        if title.strip() or content.strip() or request.FILES.getlist('images'):
            note = Note.objects.create(
                user=request.user,
                title=title,
                content=content,
                background_color=background_color,
                reminder_at=reminder_at,
            )

            # Xử lý upload ảnh
            images = request.FILES.getlist('images')
            for img in images:
                from .models import NoteImage
                NoteImage.objects.create(note=note, image=img)

            thread = threading.Thread(target=run_ai_background, args=(note.id, title, content))
            thread.start()

        return redirect('home')

    notes = Note.objects.filter(
        user=request.user, is_deleted=False, is_pinned=False, is_archived=False
    ).prefetch_related(_checklist_prefetch(), 'images').order_by('-created_at')

    pinned_notes = Note.objects.filter(
        user=request.user, is_deleted=False, is_pinned=True, is_archived=False
    ).prefetch_related(_checklist_prefetch(), 'images').order_by('-created_at')

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


def get_categories(request):
    """Trả về danh sách category: system + của user hiện tại."""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    system_cats = list(Category.objects.filter(user__isnull=True).values('id', 'name'))
    user_cats   = list(Category.objects.filter(user=request.user).values('id', 'name'))

    return JsonResponse({'system': system_cats, 'user': user_cats})

def create_category(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
        
    try:
        data = json.loads(request.body)
        name = data.get('name', '').strip()
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
        
    if not name:
        return JsonResponse({'error': 'Tên nhãn không được để trống'}, status=400)
        
    # Check if category already exists for this user or system
    exists = Category.objects.filter(name__iexact=name).filter(Q(user__isnull=True) | Q(user=request.user)).exists()
    if exists:
        return JsonResponse({'error': 'Nhãn này đã tồn tại'}, status=400)
        
    cat = Category.objects.create(name=name, user=request.user)
    return JsonResponse({'ok': True, 'id': cat.id, 'name': cat.name})

def update_category(request, category_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
        
    try:
        data = json.loads(request.body)
        name = data.get('name', '').strip()
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
        
    if not name:
        return JsonResponse({'error': 'Tên nhãn không được để trống'}, status=400)
        
    # User can only edit their own custom categories
    cat = get_object_or_404(Category, id=category_id, user=request.user)
    
    # Check if new name already exists
    exists = Category.objects.filter(name__iexact=name).exclude(id=category_id).filter(Q(user__isnull=True) | Q(user=request.user)).exists()
    if exists:
        return JsonResponse({'error': 'Nhãn này đã tồn tại'}, status=400)
        
    cat.name = name
    cat.save(update_fields=['name'])
    return JsonResponse({'ok': True, 'id': cat.id, 'name': cat.name})

def delete_category(request, category_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
        
    # User can only delete their own custom categories
    cat = get_object_or_404(Category, id=category_id, user=request.user)
    
    # Optional: If there are notes using this category, they will have category_id set to NULL due to SET_NULL on_delete policy.
    cat_id = cat.id
    cat.delete()
    return JsonResponse({'ok': True, 'deleted_id': cat_id})


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
#  IMAGE ENDPOINTS
# ──────────────────────────────────────────────

def add_note_images(request, note_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
        
    note = get_object_or_404(Note, id=note_id, user=request.user)
    images = request.FILES.getlist('images')
    
    from .models import NoteImage
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
        
    from .models import NoteImage
    img = get_object_or_404(NoteImage, id=image_id, note__user=request.user)
    img_id = img.id
    img.delete()
    return JsonResponse({'ok': True, 'deleted_id': img_id})


# ──────────────────────────────────────────────
#  TRASH
# ──────────────────────────────────────────────

def trash(request):
    if not request.user.is_authenticated:
        return redirect('home')
        
    _auto_clean_trash(request)
    
    deleted_note = Note.objects.filter(user=request.user, is_deleted=True).prefetch_related('images').order_by('-deleted_at')
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
    ).prefetch_related(_checklist_prefetch(), 'images').order_by('-created_at')

    return render(request, 'notes/archive.html', {'notes': archived_notes})


def reminders_page(request):
    """Trang hiển thị tất cả ghi chú có đặt nhắc nhở."""
    if not request.user.is_authenticated:
        return redirect('home')

    now = timezone.now()

    # Nhắc nhở sắp tới (chưa qua)
    upcoming = Note.objects.filter(
        user=request.user,
        reminder_at__gt=now,
        is_deleted=False,
    ).prefetch_related(_checklist_prefetch(), 'images').order_by('reminder_at')

    # Nhắc nhở đã qua (quá hạn)
    overdue = Note.objects.filter(
        user=request.user,
        reminder_at__lte=now,
        is_deleted=False,
    ).prefetch_related(_checklist_prefetch(), 'images').order_by('-reminder_at')

    return render(request, 'notes/reminders.html', {
        'upcoming': upcoming,
        'overdue': overdue,
    })


# ──────────────────────────────────────────────
#  REMINDER ENDPOINTS
# ──────────────────────────────────────────────

def set_reminder(request, note_id):
    """Lưu hoặc xóa reminder_at cho ghi chú."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    note = get_object_or_404(Note, id=note_id, user=request.user)

    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    reminder_str = data.get('reminder_at')  # ISO string hoặc null

    if reminder_str:
        from django.utils.dateparse import parse_datetime
        from django.utils import timezone as tz
        dt = parse_datetime(reminder_str)
        if dt is None:
            return JsonResponse({'error': 'Invalid datetime format'}, status=400)
        # Nếu naive (không có timezone) → gán timezone hiện tại
        if dt.tzinfo is None:
            import pytz
            local_tz = pytz.timezone('Asia/Ho_Chi_Minh')
            dt = local_tz.localize(dt)
        note.reminder_at = dt
        note.reminder_sent = False  # Reset để gửi lại nếu đổi giờ
    else:
        note.reminder_at = None
        note.reminder_sent = False

    note.save(update_fields=['reminder_at', 'reminder_sent'])

    return JsonResponse({
        'ok': True,
        'reminder_at': note.reminder_at.isoformat() if note.reminder_at else None,
    })


def get_due_reminders(request):
    """Trả về các note có reminder sắp đến trong 65 giây tới và đánh dấu đã gửi."""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    now = timezone.now()
    soon = now + timedelta(seconds=65)

    due_notes = Note.objects.filter(
        user=request.user,
        reminder_at__lte=soon,   # Bao gồm cả các task đã quá hạn mà chưa gửi thông báo
        reminder_sent=False,
        is_deleted=False,
    )

    reminders = []
    ids_to_mark = []
    for note in due_notes:
        reminders.append({
            'id': note.id,
            'title': note.title or '(Không tiêu đề)',
            'reminder_at': note.reminder_at.isoformat(),
        })
        ids_to_mark.append(note.id)

    if ids_to_mark:
        Note.objects.filter(id__in=ids_to_mark).update(reminder_sent=True)

    return JsonResponse({'reminders': reminders})