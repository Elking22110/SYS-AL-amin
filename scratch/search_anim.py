import os

src_dir = 'src'
for root, dirs, files in os.walk(src_dir):
    for filename in files:
        if filename.endswith(('.js', '.jsx')):
            filepath = os.path.join(root, filename)
            try:
                with open(filepath, encoding='utf-8') as f:
                    for i, line in enumerate(f):
                        if 'suppliers' in line.lower():
                            print(f"{filepath}:{i+1}: {line.strip()}")
            except Exception as e:
                pass
