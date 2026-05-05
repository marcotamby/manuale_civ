
content = open('src/components/AdminDashboardModal.tsx', 'r', encoding='utf-8').readlines()

def count_in_range(start, end):
    text = "".join(content[start-1:end])
    opens = text.count('<div')
    closes = text.count('</div>')
    print(f"Lines {start}-{end}: {opens} opens, {closes} closes")

count_in_range(1, 621) # Before return
count_in_range(622, 733) # Header + Loading
count_in_range(734, 922) # Proposte
count_in_range(923, 1175) # Users
count_in_range(1176, 1424) # Betting
count_in_range(1425, 1544) # QA
count_in_range(1545, 1635) # Footer + End
