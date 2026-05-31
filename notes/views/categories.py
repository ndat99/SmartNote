from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.template.loader import render_to_string
from datetime import timedelta
from notes.models import Note, Category, ChecklistItem, NoteImage
from django.db.models import Prefetch, Q
from django.utils import timezone
import json

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
