
import sys
import re

def check_html_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove strings and comments to avoid false positives
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    content = re.sub(r'//.*', '', content)
    content = re.sub(r'"`.*?`"|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'', '', content)
    
    tags = re.findall(r'<(div|/div)', content)
    
    balance = 0
    for i, tag in enumerate(tags):
        if tag == 'div':
            balance += 1
        else:
            balance -= 1
            if balance < 0:
                print(f"Extra closing div at tag index {i}")
                
    print(f"Final div balance: {balance}")

if __name__ == "__main__":
    check_html_balance(sys.argv[1])
