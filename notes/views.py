from django.shortcuts import render, redirect
from .models import Note
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
            # Tìm lại cái note vừa lưu trong DB
            note = Note.objects.get(id=note_id)
            
            # Cập nhật thông tin AI
            note.is_task = ai_result.get('is_task')
            note.is_task_source = 'AI'
            
            due_date_str = ai_result.get('due_date')
            if due_date_str:
                try:
                    note.due_date = due_date_str
                    note.due_date_source = 'AI'
                except Exception:
                    pass
            
            # Lưu bản cập nhật vào DB
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