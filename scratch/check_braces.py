
import sys

def check_brackets(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    brackets = {'(': ')', '{': '}', '[': ']'}
    
    for i, char in enumerate(content):
        if char in brackets:
            stack.append((char, i))
        elif char in brackets.values():
            if not stack:
                print(f"Unexpected closing bracket {char} at index {i}")
                return False
            opening, pos = stack.pop()
            if brackets[opening] != char:
                print(f"Mismatched bracket {char} at index {i} (matches {opening} at {pos})")
                return False
    
    if stack:
        for char, pos in stack:
            print(f"Unclosed bracket {char} at index {pos}")
        return False
    
    print("All brackets match!")
    return True

if __name__ == "__main__":
    check_brackets(sys.argv[1])
