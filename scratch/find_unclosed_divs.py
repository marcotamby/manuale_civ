
import re

with open('src/components/BettingPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Match <div (not followed by /), </div>, and <div ... />
# Regex for open div: <div(?![^>]*/>)
# Regex for close div: </div
tags = re.findall(r'<div(?![^>]*/>)|</div', content)
stack = []
for i, tag in enumerate(tags):
    if tag == '<div':
        stack.append(i)
    else:
        if stack:
            stack.pop()
        else:
            print(f"Extra closing tag at match {i}")

print(f"Unclosed tags: {len(stack)}")
for s in stack:
    # Find line number
    pos = 0
    for _ in range(s + 1):
        pos = content.find(tags[s], pos) + 1
    line = content.count('\n', 0, pos) + 1
    print(f"Unclosed tag at line {line}")
