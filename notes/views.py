from django.shortcuts import render, redirect, get_object_or_404
from datetime import timedelta
from .models import Note, Category
from django.utils import timezone
import threading

try:
    from .ai_helper import analyze_note_with_ai
except ImportError:
    def analyze_note_with_ai(text):
        return None

# thread gọi API Gemini
def run_ai_background(note_id, text):
    try:
        ai_result = analyze_note_with_ai(text)
        print("AI RESULT: ", ai_result)
        if ai_result:
            note = Note.objects.get(id=note_id)
            
            note.is_task = ai_result.get('is_task')
            note.is_task_source = 'AI'
            
            # 1. Bắt đầu lưu Priority
            note.priority = ai_result.get('priority')
            
            # 2. Xử lý Category thông minh (Ưu tiên System -> User -> Tạo mới)
            cat_name = ai_result.get('category')
            if cat_name:
                cat_name = cat_name.strip() # Dọn dẹp khoảng trắng thừa
                
                # B1: Tìm xem Hệ thống đã có danh mục này chưa (user=None)
                # Dùng name__iexact để nó hiểu "study", "Study", hay "STUDY" là như nhau
                category_obj = Category.objects.filter(name__iexact=cat_name, user__isnull=True).first()
                
                # B2: Nếu Hệ thống không có, tìm xem User này đã từng tự tạo chưa
                if not category_obj:
                    category_obj = Category.objects.filter(name__iexact=cat_name, user=note.user).first()
                
                # B3: Nếu cả Hệ thống và User đều chưa có, thì mới bắt đầu tạo mới cho User
                if not category_obj:
                    # Chữ cái đầu viết hoa cho đẹp (Ví dụ: study -> Study)
                    category_obj = Category.objects.create(name=cat_name.capitalize(), user=note.user)
                
                # B4: Gán vào Note
                note.category = category_obj
            
            # 3. Xử lý Due date (như cũ)
            due_date_str = ai_result.get('due_date')
            if due_date_str:
                try:
                    note.due_date = due_date_str
                    note.due_date_source = 'AI'
                except Exception:
                    pass
            
            note.save()
            print(f"[AI] Đã phân tích xong Note ID {note_id}")
    except Exception as e:
        print(f"[AI LỖI] {e}")

# hàm view chính
def home(request):
    if not request.user.is_authenticated:
        return render(request, 'notes/home.html', {'notes': []})
    
    seven_days_ago = timezone.now() - timedelta(days=7)
    Note.objects.filter(user=request.user, is_deleted=True, deleted_at__lte=seven_days_ago).delete()

    if request.method == 'POST':
        title = request.POST.get('title', '')
        content = request.POST.get('content', '')

        if title.strip() or content.strip():
            # lưu vào db
            note = Note.objects.create(
                user=request.user, 
                title=title, 
                content=content
            )
            
            # gộp text gửi AI
            text_to_analyze = f"{title}. {content}"
            
            # ĐÁ AI RA CHẠY NGẦM
            # Web sẽ đi tiếp luôn mà không đứng lại chờ dòng này
            thread = threading.Thread(target=run_ai_background, args=(note.id, text_to_analyze))
            thread.start() 
            
        return redirect('home')

    # Lấy danh sách note để hiển thị
    notes = Note.objects.filter(user=request.user, is_deleted=False, is_pinned=False).order_by('-created_at')
    pinned_notes = Note.objects.filter(user=request.user, is_deleted=False, is_pinned=True).order_by('-created_at')

    return render(request, 'notes/home.html', {'notes': notes, 'pinned_notes': pinned_notes})

# Hàm xoá
def delete_note(request, note_id):
    note = get_object_or_404(Note, id=note_id, user=request.user)

    # Cho vao thung rac
    note.is_deleted = True
    note.deleted_at = timezone.now()
    note.save()

    return redirect('home')

def trash(request):
    if not request.user.is_authenticated:
        return redirect('home')
    
    deleted_note = Note.objects.filter(user=request.user, is_deleted=True).order_by('-deleted_at')
    print("===== CÓ TÌM THẤY RÁC KHÔNG? =====", deleted_note)
    return render(request, 'notes/trash.html', {'notes': deleted_note})

def  restore_note(request, note_id):
    note = get_object_or_404(Note, id=note_id, user=request.user)

    note.is_deleted = False
    note.deleted_at = None
    note.save()

    return redirect('trash')

def hard_delete_note(request, note_id):
    note = get_object_or_404(Note, id=note_id, user=request.user)

    note.delete()
    return redirect('trash')

def toggle_pin_note(request, note_id):
    note = get_object_or_404(Note, id=note_id, user=request.user)
    note.is_pinned = not note.is_pinned
    note.save()

    return redirect('home')