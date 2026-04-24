
import re
import sys

def check_tags(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove strings and comments to avoid false positives
    content = re.sub(r'//.*', '', content)
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    content = re.sub(r"'[^']*'", "''", content)
    content = re.sub(r'"[^"]*"', '""', content)
    content = re.sub(r'`[^`]*`', '""', content, flags=re.DOTALL)
    
    # Remove TS types like <string>, <any>, <T>
    # This is tricky, but let's try to remove things that look like types
    # e.g. <string>, <StartGGTournament & { config: TournamentConfig }>, <{ slug: string }>
    content = re.sub(r'<[A-Z][a-zA-Z0-9_| &{}:]*>', '', content)
    content = re.sub(r'<string>', '', content)
    content = re.sub(r'<any>', '', content)
    content = re.sub(r'<number>', '', content)
    content = re.sub(r'<boolean>', '', content)
    content = re.sub(r'<[a-z]+:', '', content) # Avoid catching props like <div key={...}> as types
    
    # Now find tags
    # We want things like <div> or <div ... > or <div ... />
    # But NOT <= or < 5
    tags = re.findall(r'<(/?[a-zA-Z][a-zA-Z0-9.-]*)', content)
    
    # Also find self-closing tags (ending with />)
    self_closing_tags = re.findall(r'<([a-zA-Z][a-zA-Z0-9.-]*)[^>]*/>', content)
    
    stack = []
    # Real self-closing tags
    standard_self_closing = {'img', 'br', 'hr', 'input', 'meta', 'link', 'source'}
    
    # For JSX, anything ending in /> is self-closing
    jsx_self_closing = set(self_closing_tags)
    
    all_self_closing = standard_self_closing.union(jsx_self_closing)
    
    # We need to process all tags in order
    # Let's find all tags and their positions
    all_tags_info = []
    for m in re.finditer(r'<(/?[a-zA-Z][a-zA-Z0-9.-]*)[^>]*>', content):
        tag_full = m.group(0)
        tag_name = m.group(1)
        is_closing = tag_name.startswith('/')
        if is_closing:
            tag_name = tag_name[1:]
        is_self_closing = tag_full.endswith('/>') or tag_name in standard_self_closing
        
        all_tags_info.append({
            'name': tag_name,
            'is_closing': is_closing,
            'is_self_closing': is_self_closing,
            'full': tag_full,
            'pos': m.start()
        })
    
    for info in all_tags_info:
        if info['is_self_closing']:
            continue
        if info['is_closing']:
            if not stack:
                print(f"Unexpected closing tag </{info['name']}> at pos {info['pos']}")
                continue
            last = stack.pop()
            if last['name'] != info['name']:
                print(f"Mismatched tag: opening <{last['name']}> at pos {last['pos']}, closing </{info['name']}> at pos {info['pos']}")
        else:
            stack.append(info)
    
    if stack:
        for info in stack:
            print(f"Unclosed tag <{info['name']}> at pos {info['pos']}")
    else:
        print("All tags seem balanced!")

if __name__ == "__main__":
    check_tags(sys.argv[1])
