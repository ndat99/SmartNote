import os
from html.parser import HTMLParser

class HierarchyParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.path = []
        self.tags_widget_path = None

    def handle_starttag(self, tag, attrs):
        if tag not in ['img', 'br', 'hr', 'input', 'link', 'meta']:
            attrs_dict = dict(attrs)
            classes = attrs_dict.get('class', '')
            self.path.append(f"{tag}.{classes.split()[0] if classes else ''}")
            
            if 'tags-widget' in classes:
                self.tags_widget_path = list(self.path)

    def handle_endtag(self, tag):
        if tag not in ['img', 'br', 'hr', 'input', 'link', 'meta']:
            if self.path:
                self.path.pop()

base_html_path = r'd:\ndatien\HK2.25.26\LTPython\templates\base.html'
with open(base_html_path, 'r', encoding='utf-8') as f:
    content = f.read()

import re
content = re.sub(r'{%[^%]+%}', '', content)
content = re.sub(r'{{[^}]+}}', '', content)

parser = HierarchyParser()
parser.feed(content)

if parser.tags_widget_path:
    print("Hierarchy of tags-widget:")
    for p in parser.tags_widget_path:
        print(" ->", p)
else:
    print("tags-widget not found!")
