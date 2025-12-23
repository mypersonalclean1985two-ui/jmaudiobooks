import firebase_admin
from firebase_admin import credentials, firestore
import os

def check_chapters():
    print("--- Scanning Firestore for Chapters ---")
    
    # Initialize (handle if already initialized)
    if not firebase_admin._apps:
        cred_path = 'serviceAccountKey.json'
        if not os.path.exists(cred_path):
            print("ERROR: serviceAccountKey.json not found!")
            return
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    books_ref = db.collection('books')
    docs = books_ref.stream()

    found_chapters = False
    count = 0
    
    print(f"{'ID':<22} | {'Title':<30} | {'Chapters'}")
    print("-" * 70)

    for doc in docs:
        data = doc.to_dict()
        chapters = data.get('chapters', [])
        count += 1
        
        num_chapters = 0
        if isinstance(chapters, list):
            num_chapters = len(chapters)
        
        if num_chapters > 0:
            found_chapters = True
            title = data.get('title', 'Unknown')[:30]
            print(f"{doc.id:<22} | {title:<30} | {num_chapters} chapters")
            # Print first chapter title as proof
            print(f"   Sample: '{chapters[0].get('title', 'No Title')}'")
        else:
            # Uncomment to see books WITHOUT chapters
            # print(f"{doc.id:<22} | {data.get('title', 'Unknown')[:30]} | NO CHAPTERS")
            pass

    print("-" * 70)
    print(f"Scanned {count} books.")
    
    if found_chapters:
        print("VERDICT: Chapters DO exist in the database.")
    else:
        print("VERDICT: NO chapters found in any book.")

if __name__ == "__main__":
    check_chapters()
