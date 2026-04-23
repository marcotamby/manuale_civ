
with open(r'c:\Users\marco\OneDrive\Desktop\manualeciv\src\components\TournamentsPage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

div_count = 0
for i, line in enumerate(lines):
    div_count += line.count('<div')
    div_count -= line.count('</div')
    if i > 500 and i < 750:
        print(f"{i+1}: {div_count} | {line.strip()}")
