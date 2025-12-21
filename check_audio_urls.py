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
    books = db.collection('books').stream()
    
    print("--- Book Audio URLs ---")
    for book in books:
        data = book.to_dict()
        title = data.get('title', 'No Title')
        file_url = data.get('fileUrl', 'N/A')
        print(f"Title: {title}")
        print(f"  URL: {file_url}")
        print("-" * 20)

except Exception as e:
    print(f"Error: {e}")
