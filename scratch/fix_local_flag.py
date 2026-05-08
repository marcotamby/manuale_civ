import os

file_path = r'c:\Users\marco\OneDrive\Desktop\manualeciv\src\data\aoe4Data.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('"/civs/Jin Dynasty.png"', '"/civs/Jin Dynasty.webp"')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Local data updated.")
