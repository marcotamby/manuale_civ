
import re
import sys

def find_imbalance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    stack = []
    for i, line in enumerate(lines):
        # Find all divs (opening or closing)
        matches = re.finditer(r'<(div)|</(div)', line)
        for m in matches:
            if m.group(1): # opening
                stack.append(i + 1)
            else: # closing
                if not stack:
                    print(f"Extra closing div at line {i+1}")
                else:
                    stack.pop()
    
    if stack:
        print(f"Unclosed divs opened at lines: {stack}")

if __name__ == "__main__":
    find_imbalance(sys.argv[1])
