import sys

def find_mismatch(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    stack = []
    
    for i, line in enumerate(lines):
        for j, char in enumerate(line):
            if char == '{':
                stack.append((i+1, j+1))
            elif char == '}':
                if not stack:
                    print(f"Extra }} at line {i+1}")
                else:
                    stack.pop()
                    
    if stack:
        print("Unclosed { found at:")
        for (i, j) in stack:
            print(f"Line {i}, col {j}")

find_mismatch(r'c:\Users\marco\OneDrive\Desktop\manualeciv\src\components\AdminDashboardModal.tsx')
