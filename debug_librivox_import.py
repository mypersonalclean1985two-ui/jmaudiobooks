import sys
import os

# Ensure we can import from admin/
sys.path.append(os.path.join(os.getcwd(), 'admin'))

try:
    import utils
    print("Successfully imported utils.")
except Exception as e:
    print(f"Failed to import utils: {e}")
    sys.exit(1)

def test_import():
    print("--- Starting Debug Import ---")
    
    # 1. Test Search
    query = "Sherlock Holmes"
    print(f"Searching for: {query}")
    try:
        results = utils.search_librivox(query, limit=1)
        if not results:
            print("Search returned no results.")
            return
        
        book_data = results[0]
        print(f"Found book: {book_data['title']} (ID: {book_data['id']})")
        
    except Exception as e:
        print(f"Search failed: {e}")
        import traceback
        traceback.print_exc()
        return

    # 2. Test Import
    print("Attempting import...")
    try:
        utils.import_librivox_book(book_data, category="Mystery")
        print("Import SUCCESSFUL!")
    except Exception as e:
        print(f"Import FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_import()
