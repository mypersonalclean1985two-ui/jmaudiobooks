import sys
import os

# Add admin directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'admin')))

import utils

def test_admin_logic():
    print("Testing Admin Logic...")
    try:
        # Test Get Books
        books = utils.get_all_books()
        print(f"Admin Utils: Fetched {len(books)} books.")
        
        # Test Get Users
        users = utils.get_all_users()
        print(f"Admin Utils: Fetched {len(users)} users.")
        
        admin_user = next((u for u in users if u['username'] == 'admin'), None)
        if admin_user:
            print("Admin Utils: Admin user found.")
        else:
            print("Admin Utils: Admin user NOT found.")

    except Exception as e:
        print(f"Admin Utils Error: {e}")

if __name__ == "__main__":
    test_admin_logic()
