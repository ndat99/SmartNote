import re

base_html_path = r'd:\ndatien\HK2.25.26\LTPython\templates\base.html'
with open(base_html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Force update base.css version to bypass cache
content = re.sub(r'href="{% static \'css/base\.css\' %}\?v=\d+"', 'href="{% static \'css/base.css\' %}?v=3"', content)

# Also let's force right-sidebar to have width 290px inline just in case
content = content.replace('class="right-sidebar d-flex flex-column gap-4 flex-shrink-0"', 'class="right-sidebar d-flex flex-column gap-4 flex-shrink-0" style="width: 290px; padding: 0 24px 32px 16px; overflow-y: auto;"')

# Force calendar and tags widget to have white bg inline just in case
content = content.replace('class="calendar-widget p-4 shadow-sm" >', 'class="calendar-widget p-4 shadow-sm" style="background: var(--surface); border-radius: 16px;">')
content = content.replace('class="tags-widget p-4 shadow-sm" >', 'class="tags-widget p-4 shadow-sm" style="background: var(--surface); border-radius: 16px;">')

# main-content
content = content.replace('class="main-content flex-grow-1" id="mainContent"', 'class="main-content flex-grow-1" id="mainContent" style="margin: 0; padding: 0 32px 32px 32px; overflow-y: auto;"')

# filter-panel
content = content.replace('class="filter-panel d-flex flex-column" id="filterPanel"', 'class="filter-panel d-flex flex-column" id="filterPanel" style="position: static; flex-shrink: 0; width: 270px; height: 100vh; border-right: none; background: transparent; padding-top: 20px;"')

with open(base_html_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Restored inline styles for crucial layout components and updated base.css version.")
