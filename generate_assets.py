import json
import os
import shutil

# Paths
base_dir = os.path.dirname(os.path.abspath(__file__))
data_dir = os.path.join(base_dir, 'data')
books_file = os.path.join(data_dir, 'books.json')
files_dir = os.path.join(data_dir, 'files')
covers_dir = os.path.join(data_dir, 'covers')

# Ensure directories exist
os.makedirs(files_dir, exist_ok=True)
os.makedirs(covers_dir, exist_ok=True)

# Load books
with open(books_file, 'r') as f:
    books = json.load(f)

# Create dummy PDF content
dummy_pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 24 Tf 100 700 Td (Hello World) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000224 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n318\n%%EOF"

# Process books
for book in books:
    # Create dummy PDF
    pdf_path = os.path.join(files_dir, book['file'])
    if not os.path.exists(pdf_path):
        with open(pdf_path, 'wb') as f:
            f.write(dummy_pdf_content)
        print(f"Created dummy PDF: {book['file']}")
    
    # Copy placeholder to cover if missing
    # We won't overwrite existing covers, but since we know they are missing, we could.
    # Actually, let's just rely on the fallback in app.js for now, 
    # OR we can copy the placeholder.svg to the expected .jpg filename to be sure.
    # But browsers might not like .jpg extension for SVG content.
    # So we will stick to the app.js fallback strategy.

print("Dummy file generation complete.")
