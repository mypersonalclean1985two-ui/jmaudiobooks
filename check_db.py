import firebase_admin
from firebase_admin import credentials, firestore
import os

try:
    cred_path = "serviceAccountKey.json"
    if not os.path.exists(cred_path):
        # Try admin folder
        cred_path = "admin/serviceAccountKey.json"
    
    if not os.path.exists(cred_path):
        print("Error: serviceAccountKey.json not found.")
        exit(1)

    cred = credentials.Certificate(cred_path)
    print(f"Project ID from Key: {cred.project_id}")
    firebase_admin.initialize_app(cred, {
        'storageBucket': 'book-258ee.firebasestorage.app'
    })

    db = firestore.client()
    books_ref = db.collection('books')
    docs = books_ref.limit(1).stream()
    
    for doc in docs:
        book = doc.to_dict()
        print(f"ID:{doc.id}")
        print(f"TITLE:{book.get('title', 'Unknown')}")
        break

except Exception as e:
    print(f"Error: {e}")
