
import re

content = open('src/components/AdminDashboardModal.tsx', 'r', encoding='utf-8').read()
lines = content.split('\n')

stack = []
for i, line in enumerate(lines):
    # Regex to match <div (with potential attributes) or </div> (with potential spaces)
    opens = re.findall(r'<div\b', line)
    closes = re.findall(r'</div\s*>', line)
    
    for _ in opens:
        stack.append(i + 1)
    for _ in closes:
        if stack:
            stack.pop()
        else:
            print(f"EXTRA CLOSE at line {i + 1}")

for s in stack:
    print(f"UNCLOSED OPEN at line {s}")
