from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from notes.models import Notification
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import json

@login_required
def get_notifications(request):
    """Lấy danh sách thông báo của user (tối đa 20 cái mới nhất)."""
    notifications = Notification.objects.filter(user=request.user).select_related('note')[:20]
    
    data = []
    unread_count = 0
    for notif in notifications:
        if not notif.is_read:
            unread_count += 1
        data.append({
            'id': notif.id,
            'message': notif.message,
            'note_id': notif.note.id if notif.note else None,
            'is_read': notif.is_read,
            'created_at': notif.created_at.isoformat(),
        })
        
    return JsonResponse({
        'notifications': data,
        'unread_count': unread_count
    })

@login_required
@csrf_exempt
def mark_notifications_read(request):
    """Đánh dấu tất cả thông báo là đã đọc."""
    if request.method == 'POST':
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return JsonResponse({'ok': True})
    return JsonResponse({'error': 'Method not allowed'}, status=405)
