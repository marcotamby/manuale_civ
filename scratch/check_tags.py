
import re
import sys

def check_tags(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple regex for tags
    # This won't be perfect for complex JSX but can catch basic ones
    tags = re.findall(r'<(/?[a-zA-Z0-9]+)', content)
    
    stack = []
    # Self closing tags in common react/html
    self_closing = {'img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'Users', 'Calendar', 'ArrowRight', 'Loader2', 'Plus', 'LinkIcon', 'X', 'CheckCircle2', 'Edit2', 'Save', 'Trash2', 'ImageIcon', 'ChevronDown', 'ChevronUp', 'Upload', 'BookOpen', 'AlignLeft', 'AlignCenter', 'AlignRight', 'AlignJustify', 'AlertCircle', 'Settings', 'Shield', 'ArrowLeft', 'WYSIWYGEditor'}
    
    for tag in tags:
        if tag.startswith('/'):
            if not stack:
                print(f"Unexpected closing tag </{tag[1:]}>")
                continue
            last = stack.pop()
            if last != tag[1:]:
                print(f"Mismatched tag: opening <{last}>, closing </{tag[1:]}>")
        else:
            if tag in self_closing:
                continue
            stack.append(tag)
    
    if stack:
        print(f"Unclosed tags: {stack}")
    else:
        print("All tags seem balanced (ignoring self-closing ones)!")

if __name__ == "__main__":
    check_tags(sys.argv[1])
