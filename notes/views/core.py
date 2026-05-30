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
from .utils import _auto_clean_trash, _checklist_prefetch

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


def trash(request):
    if not request.user.is_authenticated:
        return redirect('home')
        
    _auto_clean_trash(request)
    
    deleted_note = Note.objects.filter(user=request.user, is_deleted=True).prefetch_related('images').order_by('-deleted_at')
    return render(request, 'notes/trash.html', {'notes': deleted_note})


def archive(request):
    if not request.user.is_authenticated:
        return redirect('home')
    
    archived_notes = Note.objects.filter(
        user=request.user,
        is_archived=True,
        is_deleted=False
    ).prefetch_related(_checklist_prefetch(), 'images').order_by('-created_at')

    return render(request, 'notes/archive.html', {'notes': archived_notes})
