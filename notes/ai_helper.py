import google.generativeai as genai
from django.conf import settings
import json
from datetime import datetime

# Cấu hình API Key
genai.configure(api_key=settings.GEMINI_API_KEY)

def analyze_note_with_ai(title, content):
    if not title and not content:
        return None
    model = genai.GenerativeModel('gemini-2.5-flash')
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    note_text = ""
    if title:
        note_text += f"Tiêu đề: {title}\n"
    if content:
        note_text += f"Nội dung: {content}"

    prompt = f"""
    Bạn là một trợ lý ảo phân tích ghi chú. Hãy đọc ghi chú sau:\n\n{note_text}
    
    Nhiệm vụ của bạn là phân tích và trả về KẾT QUẢ DUY NHẤT DƯỚI DẠNG CHUẨN JSON.
    Hôm nay là: {current_time} (Thứ {datetime.now().weekday() + 2 if datetime.now().weekday() < 6 else 'Chủ nhật'}).

    Cấu trúc JSON bắt buộc: 
    {{
        "is_task": true/false, // Ghi chú có nội dung công việc, hành động cần làm hay không?
        "priority": "High", "Medium" hoặc "Low", // Nếu không rõ thì để null
        "due_date": "YYYY-MM-DD HH:MM:SS", // Trích xuất thời gian cụ thể được nhắc đến. Nếu chỉ có giờ (VD: 8h30), hãy kết hợp với ngày hôm nay hoặc ngày được nhắc tới. Nếu không có thời gian thì để null.
        "category": "Tên danh mục" // Study, Shopping, Work, Personal, Health, Finance, Home, Entertainment, Travel, Ideas, hoặc 1 từ khóa tiếng Anh cực ngắn khác.
    }}

    Lưu ý quan trọng cho due_date:
    - Nếu ghi chú là "Mai đi học lúc 7h", due_date phải là ngày mai lúc 07:00:00.
    - Nếu ghi chú chỉ là "tắm cho chó lúc 18h", due_date là hôm nay lúc 18:00:00.
    - Luôn trả về định dạng YYYY-MM-DD HH:MM:SS.
    """

    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        # Chuyển JSON string thành Dictionary của Python
        result = json.loads(response.text)
        return result
    
    except Exception as e:
        print(f"Lỗi gọi AI: {e}")
        return None # Nếu AI ngáo hoặc lỗi mạng thì trả về None để web vẫn chạy bình thường