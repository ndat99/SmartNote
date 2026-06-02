from django.http import JsonResponse
from notes.models import Note
from django.utils import timezone

def get_calendar_dates(request):
    """
    GET /api/calendar-dates/?context=home
    Trả về danh sách các ngày (YYYY-MM-DD) có ghi chú và có lời nhắc.
    """
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthenticated'}, status=401)
        
    context = request.GET.get('context', 'home')
    
    if context == 'trash':
        qs = Note.objects.filter(user=request.user, is_deleted=True)
    elif context == 'archive':
        qs = Note.objects.filter(user=request.user, is_archived=True, is_deleted=False)
    else:
        qs = Note.objects.filter(user=request.user, is_deleted=False, is_archived=False)
        
    dates = list(qs.values('created_at', 'reminder_at'))
    
    created_dates = set()
    reminder_dates = set()
    
    for d in dates:
        if d['created_at']:
            local_created = timezone.localtime(d['created_at'])
            created_dates.add(local_created.strftime('%Y-%m-%d'))
        if d['reminder_at']:
            local_reminder = timezone.localtime(d['reminder_at'])
            reminder_dates.add(local_reminder.strftime('%Y-%m-%d'))
            
    return JsonResponse({
        'created_dates': list(created_dates),
        'reminder_dates': list(reminder_dates)
    })
