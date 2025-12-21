import sys
import os

# Add admin directory to path so we can import utils
sys.path.append(os.path.join(os.getcwd(), 'admin'))

import utils

# Test book: Pride and Prejudice (LibriVox)
# ID: pride_and_prejudice_librivox
book_data = {
    'id': 'pride_and_prejudice_librivox',
    'title': 'Pride and Prejudice (Chapter Test)'
}

print("Starting import test...")
try:
    utils.import_librivox_book(book_data)
    print("Import successful!")
except Exception as e:
    print(f"Import failed: {e}")
    import traceback
    traceback.print_exc()
