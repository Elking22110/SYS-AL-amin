import os
from pypdf import PdfReader

pdf_path = "PL May 2026.pdf"
output_path = "scripts/extracted_pdf_text.txt"

if not os.path.exists(pdf_path):
    print(f"Error: {pdf_path} not found!")
    exit(1)

reader = PdfReader(pdf_path)
total_pages = len(reader.pages)
print(f"Total pages in PDF: {total_pages}")

extracted_text = []
for idx, page in enumerate(reader.pages):
    text = page.extract_text()
    if text:
        extracted_text.append(f"--- PAGE {idx+1} ---")
        extracted_text.append(text)

with open(output_path, "w", encoding="utf-8") as f:
    f.write("\n".join(extracted_text))

print(f"Successfully extracted text from {total_pages} pages into {output_path}")
