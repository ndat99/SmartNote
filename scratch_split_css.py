import os

source_file = r'd:\ndatien\HK2.25.26\LTPython\static\css\home.css'

with open(source_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def write_css(filename, content_lines):
    path = os.path.join(r'd:\ndatien\HK2.25.26\LTPython\static\css', filename)
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(content_lines)

# Determine logical blocks based on line numbers
note_form = lines[0:118] # Note Form Wrapper
home_layout = lines[118:140] # Section Header
note_card = lines[140:301] # Note Cards
home_layout += lines[301:324] # Empty State
note_card += lines[324:419] # Note Actions Bar + Trash
note_form += lines[419:770] # MODAL GOOGLE KEEP STYLE
note_form += lines[770:915] # Modal tags row, Category picker, Tag editor
note_card += lines[915:961] # Image Grids & Stamps
note_form += lines[961:] # Modal Image Slider & remaining

# Write new files
write_css('note_form.css', note_form)
write_css('note_card.css', note_card)

# Overwrite home.css with just the layout
write_css('home.css', home_layout)

print("CSS files split successfully.")
