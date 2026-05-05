
import re

content = open('src/components/AdminDashboardModal.tsx', 'r', encoding='utf-8').read()
lines = content.split('\n')

stack = []
for i, line in enumerate(lines):
    # Find all <div and </div on this line
    tags = re.findall(r'<(div)|(/div)>', line)
    for t in tags:
        if t[0] == 'div':
            stack.append(i + 1)
        else:
            if stack:
                stack.pop()
            else:
                print(f"EXTRA CLOSE at line {i + 1}")

for s in stack:
    print(f"UNCLOSED OPEN at line {s}")
