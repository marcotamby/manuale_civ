
import sys
import re

def check_jsx_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove strings and comments
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    content = re.sub(r'//.*', '', content)
    content = re.sub(r'"`.*?`"|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'', '', content)
    
    # Find all div tags, including self-closing
    tags = re.findall(r'<div[^>]*?(/?)\s*>', content)
    
    balance = 0
    for i, tag in enumerate(tags):
        if tag == '': # <div ...>
            # Check if it's self-closing <div ... />
            # Wait, the regex above doesn't catch the trailing slash well if it's <div ... />
            pass
            
    # Better approach: find all <div and </div and <div ... />
    
    opens = re.findall(r'<div(?![^>]*?/\s*>)', content)
    closes = re.findall(r'</div\s*>', content)
    
    print(f"Opens: {len(opens)}, Closes: {len(closes)}")
    print(f"Balance: {len(opens) - len(closes)}")

if __name__ == "__main__":
    check_jsx_balance(sys.argv[1])
