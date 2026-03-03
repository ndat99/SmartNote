import google.generativeai as genai
from django.conf import settings
import json

# Cấu hình API Key
genai.configure(api_key=settings.GEMINI_API_KEY)

def analyze_note_with_ai(content):
    if not content:
        return None
    model = genai.GenerativeModel('genmini-1.5-flash')

    prompt = f"""
    Bạn là một trợ lý ảo phân tích ghi chú. Hãy đọc đoạn văn bản sau: "{content}
    Nhiệm vụ của bạn là phân tích và trả về KẾT QUẢ DUY NHẤT DƯỚI DẠNG CHUẨN JSON, không được thêm bất kỳ câu giải thích nào khác ngoài JSON.
    Cấu trúc JSON bắt buộc: 
    {{
        "is_task": true/false, // true nếu nội dung mang tính chất công việc cần làm, nhắc nhở, mua sắm. false nếu chỉ là ghi chú kể lể bình thường.
        "priority": "high", "medium" hoặc "low", // Đánh giá mức độ quan trọng. Có deadline gấp hoặc từ ngữ khẩn cấp là high.
        "due_date": "YYYY-MM-Đ HH:MM:SS" // Nếu trong câu có nhắc đến thời gian, hãy tính toán ra ngày giờ cụ thể (hôm nay là 03/03/2026). Nếu không có, để là null.
    }}
    """

    try:
        respone = model.generate_content(prompt)
        text_respone = respone.text
        # Dọn dẹp cục text AI trả về để đảm bảo nó là JSON thuần
        text_response = text_response.replace('```json', '').replace('```', '').strip()
        
        # Chuyển JSON string thành Dictionary của Python
        result = json.loads(text_response)
        return result
    except Exception as e:
        print(f"Lỗi gọi AI: {e}")
        return None # Nếu AI ngáo hoặc lỗi mạng thì trả về None để web vẫn chạy bình thường
