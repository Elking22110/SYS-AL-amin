import os

pages_dir = 'src/pages'
for filename in os.listdir(pages_dir):
    if filename.endswith('.jsx'):
        filepath = os.path.join(pages_dir, filename)
        with open(filepath, encoding='utf-8') as f:
            for i, line in enumerate(f):
                if 'animate' in line.lower():
                    print(f"{filename}:{i+1}: {line.strip()}")
