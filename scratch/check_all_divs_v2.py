
import os
import sys
import re

def check_divs(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Remove strings and comments
                content = re.sub(r'//.*', '', content)
                content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
                
                # Count <div but not </div
                open_divs = len(re.findall(r'<div(?![^>]*/>)', content))
                close_divs = content.count('</div')
                
                if open_divs != close_divs:
                    print(f"{path}: Open={open_divs}, Close={close_divs} (DIFF: {open_divs - close_divs})")

if __name__ == "__main__":
    check_divs(sys.argv[1])
