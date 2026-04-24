
import os
import sys

def check_divs(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                open_divs = content.count('<div')
                close_divs = content.count('</div')
                
                if open_divs != close_divs:
                    print(f"{path}: Open={open_divs}, Close={close_divs} (DIFF: {open_divs - close_divs})")

if __name__ == "__main__":
    check_divs(sys.argv[1])
