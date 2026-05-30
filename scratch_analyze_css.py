import os

file_path = r'd:\ndatien\HK2.25.26\LTPython\static\css\home.css'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open('scratch_css_sections.txt', 'w', encoding='utf-8') as out_f:
    for i, line in enumerate(lines):
        if line.startswith('/* ───'):
            out_f.write(f"Line {i+1}: {line.strip()}\n")
