from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.template.loader import render_to_string
from datetime import timedelta
from notes.models import Note, Category, ChecklistItem, NoteImage, Notification
from django.db.models import Prefetch, Q
from django.utils import timezone
import json

from .utils import _checklist_prefetch

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
        # Create notifications for the user
        notifications = []
        for note in due_notes:
            notifications.append(Notification(
                user=request.user,
                message=f"⏰ Lời nhắc: {note.title or '(Không tiêu đề)'}",
                note=note
            ))
        Notification.objects.bulk_create(notifications)

    return JsonResponse({'reminders': reminders})
