from django.http import JsonResponse
from django.template.loader import render_to_string
from django.core.paginator import Paginator
from notes.models import Note
from django.db.models import Q
from .utils import _checklist_prefetch
from .core import NOTES_PER_PAGE

def search_notes(request):
    """
    GET /api/search/?q=...&type=note&color=red&priority=high&category=1&page=1&context=home

    Trả về JSON:
    {
        "html": "<rendered note cards>",
        "pinned_html": "<rendered pinned cards>",  # chỉ khi context=home
        "page": 1,
        "total_pages": 5,
        "total_count": 72,
        "has_previous": false,
        "has_next": true,
        "previous_page": null,
        "next_page": 2,
    }
    """
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthenticated'}, status=401)

    q           = request.GET.get('q', '').strip()
    context     = request.GET.get('context', 'home')   # home | archive | trash
    try:
        page_number = int(request.GET.get('page', 1))
    except (ValueError, TypeError):
        page_number = 1

    types       = request.GET.getlist('type')
    colors      = request.GET.getlist('color')
    priorities  = request.GET.getlist('priority')
    categories  = request.GET.getlist('category') # If we ever change to list
    category_id = request.GET.get('category', '').strip()
    only_task   = request.GET.get('task', '') == '1'
    calendar_date = request.GET.get('date', '').strip()

    VALID_COLORS = {'', 'berry', 'red', 'orange', 'yellow', 'teal', 'blue', 'indigo', 'purple', 'pink', 'brown'}

    # ── Base queryset theo context ──
    if context == 'trash':
        base_qs = Note.objects.filter(user=request.user, is_deleted=True)
        prefetch = ['images']
        order_by = '-deleted_at'
        is_trash = True
    elif context == 'archive':
        base_qs = Note.objects.filter(user=request.user, is_archived=True, is_deleted=False)
        prefetch = [_checklist_prefetch(), 'images']
        order_by = '-created_at'
        is_trash = False
    else:  # home
        base_qs = Note.objects.filter(
            user=request.user, is_deleted=False, is_archived=False, is_pinned=False
        )
        prefetch = [_checklist_prefetch(), 'images']
        order_by = '-created_at'
        is_trash = False

    # ── Full-text search với Q objects (B-Tree index) ──
    if q:
        base_qs = base_qs.filter(
            Q(title__icontains=q) |
            Q(content__icontains=q) |
            Q(checklists__content__icontains=q)
        ).distinct()

    # ── Filter: Type (OR trong nhóm) ──
    type_q = None
    if types:
        type_q = Q()
        if 'note' in types:
            type_q |= Q(note_type='note')
        if 'checklist' in types:
            type_q |= Q(note_type='checklist')
        if 'image' in types:
            type_q |= Q(images__isnull=False)
        base_qs = base_qs.filter(type_q).distinct()

    # ── Filter: Color ──
    valid_colors_filtered = [c for c in colors if c in VALID_COLORS]
    if valid_colors_filtered:
        base_qs = base_qs.filter(background_color__in=valid_colors_filtered)

    # ── Filter: Priority ──
    valid_priorities = [p for p in priorities if p in ('high', 'medium', 'low')]
    if valid_priorities:
        base_qs = base_qs.filter(priority__in=valid_priorities)

    # ── Filter: Category ──
    if category_id and category_id.isdigit():
        base_qs = base_qs.filter(category_id=int(category_id))

    # ── Filter: Task ──
    if only_task:
        base_qs = base_qs.filter(is_task=True)

    # ── Filter: Date ──
    if calendar_date:
        from datetime import datetime
        from django.utils import timezone
        
        try:
            dt = datetime.strptime(calendar_date, '%Y-%m-%d')
            local_tz = timezone.get_current_timezone()
            
            # Khởi tạo start_of_day và end_of_day
            start_of_day = timezone.make_aware(datetime(dt.year, dt.month, dt.day, 0, 0, 0), local_tz)
            end_of_day = timezone.make_aware(datetime(dt.year, dt.month, dt.day, 23, 59, 59, 999999), local_tz)
            
            base_qs = base_qs.filter(
                Q(created_at__range=(start_of_day, end_of_day)) | 
                Q(reminder_at__range=(start_of_day, end_of_day))
            ).distinct()
        except ValueError:
            pass

    # ── Prefetch + order ──
    base_qs = base_qs.prefetch_related(*prefetch).order_by(order_by)

    # ── Paginate ──
    paginator = Paginator(base_qs, NOTES_PER_PAGE)
    page_obj = paginator.get_page(page_number)

    # ── Render HTML cho regular notes ──
    cards_html = ''
    for idx, note in enumerate(page_obj.object_list):
        card_html = render_to_string(
            'notes/components/_note_card.html',
            {'note': note, 'card_index': idx, 'is_trash': is_trash},
            request=request,
        )
        cards_html += f'<div class="col-12 col-sm-6 col-md-4 col-lg-4">{card_html}</div>'

    # ── Pinned notes (chỉ context=home) ──
    pinned_html = ''
    if context == 'home':
        pinned_qs = Note.objects.filter(
            user=request.user, is_deleted=False, is_pinned=True, is_archived=False
        ).prefetch_related(_checklist_prefetch(), 'images').order_by('-created_at')

        if q:
            pinned_qs = pinned_qs.filter(
                Q(title__icontains=q) |
                Q(content__icontains=q) |
                Q(checklists__content__icontains=q)
            ).distinct()

        if valid_colors_filtered:
            pinned_qs = pinned_qs.filter(background_color__in=valid_colors_filtered)
        if valid_priorities:
            pinned_qs = pinned_qs.filter(priority__in=valid_priorities)
        if category_id and category_id.isdigit():
            pinned_qs = pinned_qs.filter(category_id=int(category_id))
        if only_task:
            pinned_qs = pinned_qs.filter(is_task=True)
        if type_q is not None:
            pinned_qs = pinned_qs.filter(type_q).distinct()
        if calendar_date:
            try:
                dt = datetime.strptime(calendar_date, '%Y-%m-%d')
                local_tz = timezone.get_current_timezone()
                start_of_day = timezone.make_aware(datetime(dt.year, dt.month, dt.day, 0, 0, 0), local_tz)
                end_of_day = timezone.make_aware(datetime(dt.year, dt.month, dt.day, 23, 59, 59, 999999), local_tz)
                pinned_qs = pinned_qs.filter(
                    Q(created_at__range=(start_of_day, end_of_day)) | 
                    Q(reminder_at__range=(start_of_day, end_of_day))
                ).distinct()
            except ValueError:
                pass

        for idx, note in enumerate(pinned_qs):
            card_html = render_to_string(
                'notes/components/_note_card.html',
                {'note': note, 'card_index': idx, 'is_trash': False},
                request=request,
            )
            pinned_html += f'<div class="col-12 col-sm-6 col-md-4 col-lg-4">{card_html}</div>'

    return JsonResponse({
        'html': cards_html,
        'pinned_html': pinned_html,
        'page': page_obj.number,
        'total_pages': paginator.num_pages,
        'total_count': paginator.count,
        'has_previous': page_obj.has_previous(),
        'has_next': page_obj.has_next(),
        'previous_page': page_obj.previous_page_number() if page_obj.has_previous() else None,
        'next_page': page_obj.next_page_number() if page_obj.has_next() else None,
    })
