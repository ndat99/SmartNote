import os
import glob

template_dir = r'd:\ndatien\HK2.25.26\LTPython\templates\notes'
files_to_update = glob.glob(os.path.join(template_dir, '*.html'))

old_css_pattern = """<link rel="stylesheet" href="{% static 'css/home.css' %"""

new_css_links = """<link rel="stylesheet" href="{% static 'css/home.css' %}?v=1.5">
<link rel="stylesheet" href="{% static 'css/note_card.css' %}?v=1.0">
<link rel="stylesheet" href="{% static 'css/note_form.css' %}?v=1.0">"""

for file_path in files_to_update:
    if os.path.basename(file_path) == 'home.html':
        continue # Already updated
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if old_css_pattern in content:
        # We need to replace it carefully since there might be '?v=1.x' etc.
        import re
        content = re.sub(r'<link rel="stylesheet" href="{% static \'css/home\.css\' %}(.*?)"\s*>', new_css_links, content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file_path}")

print("Done updating other templates.")
