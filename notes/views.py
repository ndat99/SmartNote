from django.shortcuts import render, redirect
from .models import Note, Category
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
    notes = Note.objects.filter(user=request.user, is_deleted=False).order_by('-created_at')

    return render(request, 'notes/home.html', {'notes': notes})