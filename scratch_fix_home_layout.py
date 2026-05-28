import os
import re

home_html_path = r'd:\ndatien\HK2.25.26\LTPython\templates\notes\home.html'
with open(home_html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Force update css version to bypass cache
content = re.sub(r'href="{% static \'css/note_form\.css\' %}\?v=\d+\.\d+"', 'href="{% static \'css/note_form.css\' %}?v=2.0"', content)
content = re.sub(r'href="{% static \'css/note_card\.css\' %}\?v=\d+\.\d+"', 'href="{% static \'css/note_card.css\' %}?v=2.0"', content)
content = re.sub(r'href="{% static \'css/home\.css\' %}\?v=\d+\.\d+"', 'href="{% static \'css/home.css\' %}?v=2.0"', content)

# Restore modal overlay and wrapper inline styles
content = content.replace('class="note-form-modal-overlay" id="createNoteModalOverlay"', 'class="note-form-modal-overlay" id="createNoteModalOverlay" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 2000; align-items: flex-start; justify-content: center; padding-top: 10vh;"')

content = content.replace('class="note-form-wrapper" id="formWrapper"', 'class="note-form-wrapper" id="formWrapper" style="width: 100%; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.2); border-radius: 12px; transform: scale(0.95); opacity: 0; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);"')

with open(home_html_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Restored inline styles for home.html modal.")
