import os

maps_dir = r"c:\Users\marco\OneDrive\Desktop\manualeciv\public\maps"
current_maps_file = r"c:\Users\marco\OneDrive\Desktop\manualeciv\src\data\aoe4Maps.ts"

files = [os.path.splitext(f)[0] for f in os.listdir(maps_dir) if os.path.isfile(os.path.join(maps_dir, f))]

current_maps = []
with open(current_maps_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for line in lines:
        if '"' in line:
            map_name = line.split('"')[1]
            current_maps.append(map_name)

print(f"Total files in directory: {len(files)}")
print(f"Total items in list: {len(current_maps)}")

new_maps = sorted(list(set(files) - set(current_maps)))
print(f"New maps (in files but not in list): {new_maps}")

not_in_files = sorted(list(set(current_maps) - set(files)))
print(f"In list but not in files: {not_in_files}")
