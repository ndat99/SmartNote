from django.shortcuts import render, redirect, get_object_or_404
from notes.models import Note, Category
import threading
try:
    from notes.ai_helper import analyze_note_with_ai
except ImportError:
    def analyze_note_with_ai(title, content):
        return None

def run_ai_background(note_id, title, content):
    try:
        ai_result = analyze_note_with_ai(title, content)
        print("AI RESULT: ", ai_result)
        if ai_result:
            note = Note.objects.get(id=note_id)

            note.is_task        = ai_result.get('is_task')
            note.is_task_source = 'AI'
            note.priority       = ai_result.get('priority')
            note.priority_source = 'AI'

            cat_name = ai_result.get('category')
            if cat_name:
                cat_name = cat_name.strip()
                category_obj = Category.objects.filter(name__iexact=cat_name, user__isnull=True).first()
                if not category_obj:
                    category_obj = Category.objects.filter(name__iexact=cat_name, user=note.user).first()
                if not category_obj:
                    category_obj = Category.objects.create(name=cat_name.capitalize(), user=note.user)
                note.category = category_obj

            due_date_str = ai_result.get('due_date')
            if due_date_str:
                try:
                    # Gán cho due_date (trường tham khảo của AI)
                    note.due_date        = due_date_str
                    note.due_date_source = 'AI'

                    # TỰ ĐỘNG ĐẶT LỜI NHẮC: Nếu người dùng chưa đặt (reminder_at is null)
                    if not note.reminder_at:
                        from django.utils.dateparse import parse_datetime
                        from zoneinfo import ZoneInfo
                        dt = parse_datetime(due_date_str)
                        if dt:
                            # Đảm bảo timezone chuẩn
                            if dt.tzinfo is None:
                                dt = dt.replace(tzinfo=ZoneInfo('Asia/Ho_Chi_Minh'))
                            note.reminder_at = dt
                            print(f"[AI] Tự động đặt nhắc nhở cho Note ID {note_id} lúc {due_date_str}")
                except Exception as e:
                    print(f"[AI Lỗi parse date] {e}")

            note.save()
            print(f"[AI] Đã phân tích xong Note ID {note_id}")
    except Exception as e:
        print(f"[AI LỖI] {e}")
