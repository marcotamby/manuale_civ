import os

maps_dir = r"c:\Users\marco\OneDrive\Desktop\manualeciv\public\maps"
current_maps_file = r"c:\Users\marco\OneDrive\Desktop\manualeciv\src\data\aoe4Maps.ts"

# Get files in directory (without extension)
files = [os.path.splitext(f)[0] for f in os.listdir(maps_dir) if os.path.isfile(os.path.join(maps_dir, f))]

# Read current maps from file
current_maps = []
with open(current_maps_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for line in lines:
        if '"' in line:
            map_name = line.split('"')[1]
            current_maps.append(map_name)

# Find differences
new_maps = sorted(list(set(files) - set(current_maps)))
missing_files = sorted(list(set(current_maps) - set(files)))

print(f"New maps found in directory: {new_maps}")
print(f"Maps in list but missing files: {missing_files}")
