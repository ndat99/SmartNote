import os

home_html_path = r'd:\ndatien\HK2.25.26\LTPython\templates\notes\home.html'
note_form_css_path = r'd:\ndatien\HK2.25.26\LTPython\static\css\note_form.css'

with open(home_html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove inline styles from home.html
content = content.replace('style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 2000; align-items: flex-start; justify-content: center; padding-top: 10vh;"', '')
content = content.replace('style="width: 100%; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.2); border-radius: 12px; transform: scale(0.95); opacity: 0; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);"', '')

# Update home.html to include new CSS files
# Wait, I should also add the links in home.html
# Currently: <link rel="stylesheet" href="{% static 'css/home.css' %}?v=1.4">
# I'll replace it with three links
old_css_links = """<link rel="stylesheet" href="{% static 'css/home.css' %}?v=1.4">
<link rel="stylesheet" href="{% static 'css/colors.css' %}">"""

new_css_links = """<link rel="stylesheet" href="{% static 'css/home.css' %}?v=1.5">
<link rel="stylesheet" href="{% static 'css/note_card.css' %}?v=1.0">
<link rel="stylesheet" href="{% static 'css/note_form.css' %}?v=1.0">
<link rel="stylesheet" href="{% static 'css/colors.css' %}">"""

content = content.replace(old_css_links, new_css_links)

with open(home_html_path, 'w', encoding='utf-8') as f:
    f.write(content)

# Append new classes to note_form.css
new_css = """
/* ─── Note Form Modal Layout ─── */
.note-form-modal-overlay {
    /* Base display handled by inline JS (display: none/flex) */
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 2000;
    align-items: flex-start;
    justify-content: center;
    padding-top: 10vh;
}

/* Override .note-form-wrapper */
.note-form-modal-overlay .note-form-wrapper {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    border-radius: 12px;
    transform: scale(0.95);
    opacity: 0;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
"""

with open(note_form_css_path, 'a', encoding='utf-8') as f:
    f.write(new_css)

print("home.html layout styles extracted to note_form.css and links updated")
