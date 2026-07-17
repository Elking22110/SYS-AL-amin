import re

input_path = "scripts/extracted_pdf_text.txt"
output_path = "scripts/company_list_source.txt"

with open(input_path, "r", encoding="utf-8") as f:
    text = f.read()

lines = text.split("\n")

parsed_items = []
all_brands = ["BR", "KS", "SM", "SG", "SL", "NC", "MX", "BU", "FT", "MP"]

# A mapping to clean up names (normalize spaces, etc.)
for line in lines:
    line = line.strip()
    if not line:
        continue
        
    code_match = re.search(r'\b(\d{9})\b', line)
    if code_match:
        code = code_match.group(1)
        
        # Check brand as substring
        brand = None
        for b in all_brands:
            if b in line:
                brand = b
                break
        
        if not brand:
            brand = "UNKNOWN"
            
        line_no_code = line.replace(code, "").strip()
        
        # Find price
        price = None
        prices = re.findall(r'\b(\d+(?:\.\d+)?)\b', line_no_code)
        if prices:
            for p in prices:
                if re.search(r'\b' + brand + r'\s+' + p + r'\b|\b' + p + r'\s+' + brand + r'\b', line_no_code):
                    price = float(p)
                    break
            if not price:
                # If not adjacent, try to find a float at the end of the line
                # Prices are usually floats at the end
                last_token = line_no_code.split()[-1]
                if re.match(r'^\d+(?:\.\d+)?$', last_token):
                    price = float(last_token)
                else:
                    # Fallback to last match
                    price = float(prices[-1])
        
        # Extract name: remove code and price from raw line
        name = line_no_code
        if price:
            name = name.replace(str(price), "")
            # Also handle if it had decimal .00
            name = name.replace(f"{price:.2f}", "").replace(f"{price:.1f}", "")
            
        # Clean name
        name = re.sub(r'\s+', ' ', name).strip()
        
        parsed_items.append({
            "code": code,
            "name": name,
            "brand": brand,
            "price": price if price is not None else 0.0
        })

# Write to scripts/company_list_source.txt in expected format
with open(output_path, "w", encoding="utf-8") as f:
    f.write("Code Material Brand LP\n")  # Header
    for item in parsed_items:
        # Format: {code} {name} {brand} {price}
        # Price is formatted to 2 decimal places
        f.write(f"{item['code']} {item['name']} {item['brand']} {item['price']:.2f}\n")

print(f"Successfully wrote {len(parsed_items)} items to {output_path}")
