
import sys

def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    braces = 0
    parens = 0
    cur_line = 1
    for i, char in enumerate(content):
        if char == '\n':
            cur_line += 1
        if char == '{':
            braces += 1
        elif char == '}':
            braces -= 1
            if braces < 0:
                print(f"Extra closing brace at line {cur_line}")
        elif char == '(':
            parens += 1
        elif char == ')':
            parens -= 1
            if parens < 0:
                print(f"Extra closing paren at line {cur_line}")
                
    print(f"Final balance - Braces: {braces}, Parens: {parens}")

if __name__ == "__main__":
    check_balance(sys.argv[1])
