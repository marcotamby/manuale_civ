import os

file_path = r'c:\Users\marco\OneDrive\Desktop\manualeciv\src\data\aoe4Data.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if '"Landsknecht - (Età 3)"' in line:
        continue
    if '"Prelato - (Età 1)"' in line:
        continue
    if '"Man-at-Arms - (Età 2)"' in line:
        continue
    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("File updated successfully.")
