import firebase_admin
from firebase_admin import credentials, firestore
import os

try:
    cred_path = "serviceAccountKey.json"
    if not os.path.exists(cred_path):
        cred_path = "admin/serviceAccountKey.json"
    
    if not os.path.exists(cred_path):
        print("Error: serviceAccountKey.json not found.")
        exit(1)

    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

    db = firestore.client()
    books = db.collection('books').limit(10).stream()
    
    with open("cover_check_output.txt", "w", encoding="utf-8") as f:
        f.write("--- Book Cover URLs (First 10 Books) ---\n")
        for book in books:
            data = book.to_dict()
            title = data.get('title', 'No Title')
            cover_url = data.get('coverUrl', 'N/A')
            cover_image = data.get('coverImage', 'N/A')
            f.write(f"Title: {title}\n")
            f.write(f"  coverUrl: {cover_url}\n")
            f.write(f"  coverImage: {cover_image}\n")
            f.write(f"  All keys: {list(data.keys())}\n")
            f.write("-" * 50 + "\n")
    
    print("Output written to cover_check_output.txt")

except Exception as e:
    print(f"Error: {e}")
