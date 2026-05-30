from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.template.loader import render_to_string
from datetime import timedelta
from notes.models import Note, Category, ChecklistItem, NoteImage
from django.db.models import Prefetch, Q
from django.utils import timezone
import json

import time

def _auto_clean_trash(request):
    """Auto-clean trash: tối đa 1 lần/giờ/session, tránh chạy mỗi request."""
    if not request.user.is_authenticated:
        return
    last_clean = request.session.get('last_trash_clean', 0)
    if time.time() - last_clean > 3600:
        seven_days_ago = timezone.now() - timedelta(days=7)
        Note.objects.filter(user=request.user, is_deleted=True, deleted_at__lte=seven_days_ago).delete()
        request.session['last_trash_clean'] = time.time()


def _checklist_prefetch():
    return Prefetch('checklists', queryset=ChecklistItem.objects.order_by('position'))


# ──────────────────────────────────────────────
#  HOME
# ──────────────────────────────────────────────
