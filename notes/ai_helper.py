import google.generativeai as genai
from django.conf import settings
import json
from datetime import datetime

# Cấu hình API Key
genai.configure(api_key=settings.GEMINI_API_KEY)

def analyze_note_with_ai(content):
    if not content:
        return None
    model = genai.GenerativeModel('gemini-2.5-flash')
    today = datetime.now().strftime("%d/%m/%Y")
    
    prompt = f"""
    Bạn là một trợ lý ảo phân tích ghi chú. Hãy đọc đoạn văn bản sau: "{content}"
    
    Nhiệm vụ của bạn là phân tích và trả về KẾT QUẢ DUY NHẤT DƯỚI DẠNG CHUẨN JSON.
    Cấu trúc JSON bắt buộc: 
    {{
        "is_task": true/false,
        "priority": "High", "Medium" hoặc "Low", // Nếu không rõ thì để null
        "due_date": "YYYY-MM-DD HH:MM:SS", // Hôm nay là {today}. Nếu không có thì để null
        "category": "Tên danh mục" // Hãy ƯU TIÊN phân loại vào 1 trong các danh mục sau nếu phù hợp: Study, Shopping, Work, Personal, Health, Finance, Home, Entertainment, Travel, Ideas. Nếu nội dung hoàn toàn không thuộc các nhóm này, hãy tự trích xuất 1 từ khóa tiếng Anh ngắn gọn khác. Nếu không thể phân loại thì để null.
    }}
    """

    try:
        response = model.generate_content(prompt)
        text_response = response.text
        # Dọn dẹp cục text AI trả về để đảm bảo nó là JSON thuần
        text_response = text_response.replace('```json', '').replace('```', '').strip()
        
        # Chuyển JSON string thành Dictionary của Python
        result = json.loads(text_response)
        return result
    except Exception as e:
        print(f"Lỗi gọi AI: {e}")
        return None # Nếu AI ngáo hoặc lỗi mạng thì trả về None để web vẫn chạy bình thường
