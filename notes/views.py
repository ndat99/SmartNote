from django.shortcuts import render, redirect
from .models import Note
from .ai_helper import analyze_note_with_ai

def home(request):
    if not request.user.is_authenticated:
        return render(request, 'notes/home.html', {'notes': []})
    
    if request.method == 'POST':
        title = request.POST.get('title', '')
        content = request.POST.get('content', '')

        if title or content:
            #1. Tao mot Ghi chu moi
            note = Note(user=request.user, title=title, content=content)
            #2. Gop tieu de va noi dung de gui cho AI doc hieu
            text_to_analyze = f"{title}. {content}"
            #3. Kich hoat AI chay ngam
            ai_result = analyze_note_with_ai(text_to_analyze)
            #4. Tra ket qua ve
            if ai_result:
                note.is_task  =ai_result.get('is_task')
                note.is_task_source = 'AI'

                # Ep kieu ngay thang (neu co)
                due_date_str =  ai_result.get('due_date')
                if due_date_str:
                    try:
                        note.due_date = due_date_str
                        note.due_date_source = 'AI'
                    except Exception:
                        pass

                note.save()
            return redirect('home')

    notes = Note.objects.filter(user=request.user, is_deleted=False).order_by('-created_at')

    return render(request, 'notes/home.html', {'notes': notes})