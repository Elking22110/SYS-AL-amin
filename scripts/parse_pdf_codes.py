import re

input_path = "scripts/extracted_pdf_text.txt"

with open(input_path, "r", encoding="utf-8") as f:
    text = f.read()

# Regular expression to find lines with 9-digit codes
# In many PDFs, text is read line by line. Let's split by lines first.
lines = text.split("\n")

parsed_items = []
unparsed_lines = []

# Brands we are interested in
# BR: PPR products
# KS: Kessel PP products
# SM, SG, SL, NC, MX: Smart Home/Smart white drainage PVC
all_brands = ["BR", "KS", "SM", "SG", "SL", "NC", "MX", "BU", "FT", "MP"]

for line_idx, line in enumerate(lines):
    line = line.strip()
    if not line:
        continue
        
    # Search for 9-digit code
    code_match = re.search(r'\b(\d{9})\b', line)
    if code_match:
        code = code_match.group(1)
        
        # Check brand as substring to handle cases where it's attached to Arabic letters (e.g. مواسيرلحامBR)
        brand = None
        for b in all_brands:
            if b in line:
                brand = b
                break
        
        # Try to find list price (LP)
        # Often price is a decimal or int at the start or end of the line
        price = None
        # Let's clean the code from line to avoid matching it as price
        line_no_code = line.replace(code, "").strip()
        # Find floats or ints representing price
        prices = re.findall(r'\b(\d+(?:\.\d+)?)\b', line_no_code)
        if prices:
            # Typically, price is the last or second to last number, or adjacent to brand
            # Let's check numbers that are not brand names
            # In our list, brand and price are usually adjacent
            for p in prices:
                # If we have brand, look for price near it
                if brand:
                    if re.search(r'\b' + brand + r'\s+' + p + r'\b|\b' + p + r'\s+' + brand + r'\b', line_no_code):
                        price = float(p)
                        break
            if not price and len(prices) > 0:
                # Fallback to last number that is not code and looks like a price
                price = float(prices[-1])
        
        # Extract name: remove code, brand, price from line
        name = line_no_code
        if brand:
            name = re.sub(r'\b' + brand + r'\b', '', name)
        if price:
            name = name.replace(str(price), "")
            # Also handle if it had .00 or similar
            name = name.replace(f"{price:.2f}", "").replace(f"{price:.1f}", "")
        
        name = re.sub(r'\s+', ' ', name).strip()
        
        parsed_items.append({
            "line_no": line_idx + 1,
            "code": code,
            "brand": brand or "UNKNOWN",
            "price": price,
            "name": name,
            "raw_line": line
        })
    else:
        unparsed_lines.append(line)

print(f"Total parsed items with 9-digit codes: {len(parsed_items)}")
print(f"Total lines without 9-digit codes: {len(unparsed_lines)}")

# Group by brand
brand_counts = {}
for item in parsed_items:
    b = item["brand"]
    brand_counts[b] = brand_counts.get(b, 0) + 1

print("\n=== Brand Counts in PDF ===")
for b, count in sorted(brand_counts.items(), key=lambda x: x[1], reverse=True):
    print(f"  {b}: {count} items")

# Let's write the parsed items to scripts/pdf_parsed_all.txt for inspect
with open("scripts/pdf_parsed_all.txt", "w", encoding="utf-8") as f:
    for item in parsed_items:
        f.write(f"[{item['brand']}] {item['code']} | Price: {item['price']} | Name: {item['name']} | Raw: {item['raw_line']}\n")
