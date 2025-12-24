import firebase_admin
from firebase_admin import credentials, firestore
import os

"""
Migration script to remove duplicate chapters from existing books in Firestore.
This fixes books that were imported before the deduplication logic was added.
"""

try:
    cred_path = "serviceAccountKey.json"
    if not os.path.exists(cred_path):
        cred_path = "admin/serviceAccountKey.json"
    
    if not os.path.exists(cred_path):
        print("Error: serviceAccountKey.json not found.")
        exit(1)

    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {
        'storageBucket': 'book-258ee.firebasestorage.app'
    })

    db = firestore.client()
    books_ref = db.collection('books')
    
    print("Fetching all books...")
    docs = books_ref.stream()
    
    updated_count = 0
    skipped_count = 0
    
    for doc in docs:
        book = doc.to_dict()
        book_id = doc.id
        
        if 'chapters' not in book or not isinstance(book['chapters'], list):
            print(f"Skipping {book_id}: No chapters array")
            skipped_count += 1
            continue
        
        original_chapters = book['chapters']
        original_count = len(original_chapters)
        
        # Deduplicate chapters
        seen_titles = {}
        unique_chapters = []
        
        for chapter in original_chapters:
            title = chapter.get('title', '')
            file_url = chapter.get('fileUrl', '')
            
            # Extract base title (remove quality indicators)
            base_title = title.replace('_64kb', '').replace('_128kb', '').replace('_vbr', '')
            
            # Check if we've seen this chapter before
            if base_title not in seen_titles:
                seen_titles[base_title] = chapter
                unique_chapters.append(chapter)
            else:
                # If this is VBR quality, prefer it over the existing one
                if '_vbr' in file_url.lower() or 'VBR' in file_url:
                    # Replace the existing one
                    for i, ch in enumerate(unique_chapters):
                        if ch.get('title', '').replace('_64kb', '').replace('_128kb', '').replace('_vbr', '') == base_title:
                            unique_chapters[i] = chapter
                            seen_titles[base_title] = chapter
                            break
        
        new_count = len(unique_chapters)
        
        if new_count < original_count:
            print(f"\n{book.get('title', book_id)}:")
            print(f"  Original: {original_count} chapters")
            print(f"  Deduplicated: {new_count} chapters")
            print(f"  Removed: {original_count - new_count} duplicates")
            
            # Update Firestore
            books_ref.document(book_id).update({
                'chapters': unique_chapters
            })
            updated_count += 1
            print(f"  ✅ Updated in Firestore")
        else:
            skipped_count += 1
    
    print(f"\n{'='*50}")
    print(f"Migration Complete!")
    print(f"  Books updated: {updated_count}")
    print(f"  Books skipped (no duplicates): {skipped_count}")
    print(f"{'='*50}")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
