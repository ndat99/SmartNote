import os

base_html_path = r'd:\ndatien\HK2.25.26\LTPython\templates\base.html'
base_css_path = r'd:\ndatien\HK2.25.26\LTPython\static\css\base.css'

with open(base_html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove inline styles from base.html layout components
content = content.replace('style="height: 100vh; overflow: hidden;"', '')
content = content.replace('style="position: static; flex-shrink: 0; width: 270px; height: 100vh; border-right: none; background: transparent; padding-top: 20px;"', '')
content = content.replace('class="d-flex flex-column flex-grow-1" style="overflow: hidden;"', 'class="d-flex flex-column flex-grow-1 app-center-column"')
content = content.replace('style="margin: 0; padding: 0 32px 32px 32px; overflow-y: auto;"', '')
content = content.replace('style="width: 290px; padding: 0 24px 32px 16px; overflow-y: auto;"', '')
content = content.replace('style="background: var(--surface); border-radius: 16px;"', '')

with open(base_html_path, 'w', encoding='utf-8') as f:
    f.write(content)

# Append new classes to base.css
new_css = """
/* ─── Main Layout Styles ─── */
.app-layout {
    height: 100vh;
    overflow: hidden;
}

.filter-panel {
    position: static;
    flex-shrink: 0;
    width: 270px;
    height: 100vh;
    border-right: none;
    background: transparent;
    padding-top: 20px;
}

.app-center-column {
    overflow: hidden;
}

.main-content {
    margin: 0;
    padding: 0 32px 32px 32px;
    overflow-y: auto;
}

.right-sidebar {
    width: 290px;
    padding: 0 24px 32px 16px;
    overflow-y: auto;
}

.calendar-widget, .tags-widget {
    background: var(--surface);
    border-radius: 16px;
}
"""

with open(base_css_path, 'a', encoding='utf-8') as f:
    f.write(new_css)

print("base.html layout styles extracted to base.css")
