
content = open('src/components/AdminDashboardModal.tsx', 'r', encoding='utf-8').read()
opens = content.count('(')
closes = content.count(')')
curlys_open = content.count('{')
curlys_close = content.count('}')
divs_open = content.count('<div')
divs_close = content.count('</div')

print(f"Parentheses: {opens} opens, {closes} closes")
print(f"Curly braces: {curlys_open} opens, {curlys_close} closes")
print(f"Divs: {divs_open} opens, {divs_close} closes")
