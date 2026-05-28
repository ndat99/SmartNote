import os
import re

file_path = r'd:\ndatien\HK2.25.26\LTPython\templates\base.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the hardcoded calendar content
old_calendar_pattern = re.compile(r'(<div class="calendar-widget.*?>\s*<h6.*?>\s*Tháng.*?</div>\s*</h6>\s*<div class="calendar-grid.*?>).*?(</div>\s*</div>)', re.DOTALL)

def replace_calendar(match):
    header = match.group(1)
    footer = match.group(2)
    
    # We will modify the header to include IDs for JS
    header = header.replace('Tháng {% now "n, Y" %}', '<span id="calendarMonthYear">Tháng {% now "n, Y" %}</span>')
    header = header.replace('<i class="ph ph-caret-left', '<i class="ph ph-caret-left" onclick="changeCalendarMonth(-1)"')
    header = header.replace('<i class="ph ph-caret-right', '<i class="ph ph-caret-right" onclick="changeCalendarMonth(1)"')
    header = header.replace('class="calendar-grid text-center"', 'class="calendar-grid text-center" id="calendarGrid"')
    
    new_days = """
                            <div class="text-muted mb-1" style="font-size: 0.75rem;">T2</div>
                            <div class="text-muted mb-1" style="font-size: 0.75rem;">T3</div>
                            <div class="text-muted mb-1" style="font-size: 0.75rem;">T4</div>
                            <div class="text-muted mb-1" style="font-size: 0.75rem;">T5</div>
                            <div class="text-muted mb-1" style="font-size: 0.75rem;">T6</div>
                            <div class="text-muted mb-1" style="font-size: 0.75rem;">T7</div>
                            <div class="text-muted mb-1" style="font-size: 0.75rem;">CN</div>
                            <!-- JS sẽ tự động điền lịch vào đây -->"""
    return header + new_days + footer

if re.search(old_calendar_pattern, content):
    content = re.sub(old_calendar_pattern, replace_calendar, content)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Calendar updated in base.html")
else:
    print("Calendar pattern not found!")
