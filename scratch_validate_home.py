import os
from html.parser import HTMLParser

class StrictHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        if tag not in ['img', 'br', 'hr', 'input', 'link', 'meta']:
            self.stack.append((tag, self.getpos()))

    def handle_endtag(self, tag):
        if tag not in ['img', 'br', 'hr', 'input', 'link', 'meta']:
            if not self.stack:
                self.errors.append(f"Line {self.getpos()[0]}: Unexpected </{tag}>")
                return
            last_tag, pos = self.stack.pop()
            if last_tag != tag:
                self.errors.append(f"Line {self.getpos()[0]}: Expected </{last_tag}> from line {pos[0]}, got </{tag}>")

home_html_path = r'd:\ndatien\HK2.25.26\LTPython\templates\notes\home.html'
with open(home_html_path, 'r', encoding='utf-8') as f:
    content = f.read()

parser = StrictHTMLParser()
# Replace django tags to not mess up HTML parser
import re
content = re.sub(r'{%[^%]+%}', '', content)
content = re.sub(r'{{[^}]+}}', '', content)
parser.feed(content)

for err in parser.errors:
    print(err)
if parser.stack:
    print("Unclosed tags:")
    for tag, pos in parser.stack:
        print(f"<{tag}> at line {pos[0]}")
if not parser.errors and not parser.stack:
    print("HTML is well-formed.")
