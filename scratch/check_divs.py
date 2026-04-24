
import sys

def count_divs(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    open_divs = content.count('<div')
    close_divs = content.count('</div')
    
    print(f"Open <div: {open_divs}")
    print(f"Close </div: {close_divs}")

if __name__ == "__main__":
    count_divs(sys.argv[1])
