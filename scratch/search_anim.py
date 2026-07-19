filepath = 'src/components/POS/ProductGrid.jsx'
out = open('scratch/search_results.txt', 'w', encoding='utf-8')
lines = open(filepath, encoding='utf-8', errors='ignore').readlines()
for i, line in enumerate(lines):
    if 'renderproducttitle' in line.lower():
        start = max(0, i - 2)
        end = min(len(lines), i + 20)
        for j in range(start, end):
            out.write(f"{j+1}: {lines[j].strip()}\n")
        break
out.close()
print("Search finished, results written to scratch/search_results.txt")
