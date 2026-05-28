from django.db.models import Count, Q
from .models import Category

def popular_tags(request):
    if request.user.is_authenticated:
        # Count notes per category for the current user (excluding deleted ones)
        tags = Category.objects.filter(
            Q(user=request.user) | Q(user__isnull=True)
        ).annotate(
            note_count=Count('note', filter=Q(note__user=request.user, note__is_deleted=False))
        ).filter(note_count__gt=0).order_by('-note_count')[:10]
        return {'popular_tags': tags}
    return {'popular_tags': []}
