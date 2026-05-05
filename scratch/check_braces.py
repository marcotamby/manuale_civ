import sys

def check_braces(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We will do a simple count just to see if there is a mismatch
    # ignoring strings/comments is hard in simple regex but let's just count first
    
    open_braces = content.count('{')
    close_braces = content.count('}')
    
    print(f"{{ count: {open_braces}")
    print(f"}} count: {close_braces}")
    
check_braces(r'c:\Users\marco\OneDrive\Desktop\manualeciv\src\components\AdminDashboardModal.tsx')
