import sys
import os
import shutil
import firebase_admin
from firebase_admin import credentials, firestore, storage

# Initialize Firebase Admin
# Check if already initialized to avoid errors on reload
# Check if already initialized to avoid errors on reload
if not firebase_admin._apps:
    if getattr(sys, 'frozen', False):
        # Running as PyInstaller bundle
        cred_path = os.path.join(sys._MEIPASS, 'serviceAccountKey.json')
    else:
        # Running in development
        cred_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'serviceAccountKey.json')
    
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {
        'storageBucket': 'book-258ee.firebasestorage.app'
    })

db = firestore.client()
bucket = storage.bucket()

def get_all_books():
    try:
        books_ref = db.collection('books')
        docs = books_ref.stream()
        books = []
        for doc in docs:
            book_data = doc.to_dict()
            # Ensure ID is included
            book_data['id'] = doc.id 
            books.append(book_data)
        return books
    except Exception as e:
        print(f"Error getting books: {e}")
        return []

def add_book(title, author, category, price, cover_path, file_path, description="", narrator="", duration="", chapters=None):
    try:
        # Generate a new ID (or use auto-id)
        # We'll use auto-id from Firestore
        new_book_ref = db.collection('books').document()
        
        cover_filename = os.path.basename(cover_path)
        file_filename = os.path.basename(file_path)
        
        cover_url = ""
        file_url = ""

        # Upload Cover
        if cover_path.startswith('http'):
            cover_url = cover_path
        elif os.path.exists(cover_path):
            blob = bucket.blob(f"covers/{cover_filename}")
            blob.upload_from_filename(cover_path)
            blob.make_public()
            cover_url = blob.public_url

        # Upload File
        if file_path.startswith('http'):
            file_url = file_path
        elif os.path.exists(file_path):
            blob = bucket.blob(f"files/{file_filename}")
            blob.upload_from_filename(file_path)
            # Files should probably be private and signed, but for now making public for simplicity or signed
            # blob.make_public() 
            # file_url = blob.public_url
            # Use signed URL for file
            file_url = f"files/{file_filename}" # Client generates signed URL

        book_data = {
            'id': new_book_ref.id,
            'title': title,
            'author': author,
            'category': category,
            'price': float(price),
            'description': description,
            'narrator': narrator,
            'duration': duration,
            'coverUrl': cover_url,
            'fileUrl': file_url,
            'fileUrl': file_url,
            'chapters': chapters or [],
            'createdAt': firestore.SERVER_TIMESTAMP
        }
        
        new_book_ref.set(book_data)
        print(f"Book added with ID: {new_book_ref.id}")

    except Exception as e:
        print(f"Error adding book: {e}")
        raise e

def delete_book(book_id):
    try:
        db.collection('books').document(str(book_id)).delete()
        print(f"Book deleted: {book_id}")
    except Exception as e:
        print(f"Error deleting book: {e}")

def get_all_users():
    try:
        users_ref = db.collection('users')
        docs = users_ref.stream()
        users = []
        for doc in docs:
            user_data = doc.to_dict()
            user_data['id'] = doc.id
            users.append(user_data)
        return users
    except Exception as e:
        print(f"Error getting users: {e}")
        return []

def add_user(username, email, password, is_admin=False):
    # Note: Creating users in Firebase Auth via Admin SDK is better, 
    # but for now we are just storing in Firestore 'users' collection as per previous schema?
    # Actually, we should create in Firebase Auth.
    try:
        from firebase_admin import auth
        user = auth.create_user(
            email=email,
            password=password,
            display_name=username
        )
        # Also create user document
        db.collection('users').document(user.uid).set({
            'email': email,
            'displayName': username,
            'isAdmin': is_admin,
            'createdAt': firestore.SERVER_TIMESTAMP
        })
        print(f"User created: {user.uid}")
    except Exception as e:
        print(f"Error adding user: {e}")
        raise e

def delete_user(user_id):
    try:
        from firebase_admin import auth
        auth.delete_user(user_id)
        db.collection('users').document(user_id).delete()
        print(f"User deleted: {user_id}")
    except Exception as e:
        print(f"Error deleting user: {e}")

# --- INTERNET ARCHIVE INTEGRATION (Replaces LibriVox Direct) ---
import requests

def search_librivox(query, offset=0, limit=20):
    try:
        # Construct Archive.org Advanced Search Query
        # We search in 'librivoxaudio' collection
        # We search for query in title OR subject
        
        search_query = f"collection:librivoxaudio AND (title:({query}) OR subject:({query}))"
        
        params = {
            "q": search_query,
            "fl": "identifier,title,creator,description,subject,downloads",  # Comma-separated string
            "rows": limit,
            "page": (offset // limit) + 1, # Archive.org uses page number (1-based), not offset
            "output": "json",
            "sort": "downloads desc"  # String instead of list
        }
        
        url = "https://archive.org/advancedsearch.php"
        response = requests.get(url, params=params)
        data = response.json()
        
        docs = data.get('response', {}).get('docs', [])
        
        # Map to our expected format
        books = []
        for doc in docs:
            # Handle creator - might be string or list
            creator = doc.get('creator', 'Unknown')
            if isinstance(creator, list):
                creator = creator[0] if creator else 'Unknown'
                
            books.append({
                'id': doc.get('identifier'),
                'title': doc.get('title'),
                'authors': [{'first_name': creator, 'last_name': ''}],
                'description': doc.get('description', ''),
                'url_librivox': f"https://archive.org/details/{doc.get('identifier')}"
            })
            
        return books
    except Exception as e:
        print(f"Error searching Archive.org: {e}")
        import traceback
        traceback.print_exc()
        return []

def import_librivox_book(book_data, category="Classic"):
    try:
        identifier = book_data.get('id')
        if not identifier:
            raise Exception("No identifier found")
            
        print(f"Fetching Metadata for: {identifier}")
        meta_url = f"https://archive.org/metadata/{identifier}"
        meta_response = requests.get(meta_url)
        meta_data = meta_response.json()
        
        files = meta_data.get('files', [])
        server = meta_data.get('server')
        dir_path = meta_data.get('dir')
        
        # Find all MP3s
        mp3_files = [f for f in files if f.get('format') in ['VBR MP3', '128Kbps MP3', '64Kbps MP3']]
        mp3_files.sort(key=lambda x: x.get('name')) # Basic sort by filename

        if not mp3_files:
             raise Exception("No MP3 files found in this item")

        # Construct URLs and Chapters
        chapters = []
        for f in mp3_files:
            f_name = f.get('name')
            f_url = f"https://archive.org/download/{identifier}/{f_name}"
            f_title = f.get('title', f_name)
            f_len = f.get('length', 0)
            try:
                f_len = float(f_len)
            except:
                f_len = 0
            
            chapters.append({
                'title': f_title,
                'fileUrl': f_url,
                'duration': f_len
            })

        # Use first file as main fileUrl for fallback
        mp3_url = chapters[0]['fileUrl']
        cover_url = f"https://archive.org/services/img/{identifier}"
        
        # Get Metadata
        metadata = meta_data.get('metadata', {})
        title = metadata.get('title', book_data.get('title'))
        author = metadata.get('creator', 'Unknown')
        description = metadata.get('description', '')
        duration = metadata.get('runtime', '') # Archive.org often has runtime
        
        print(f"Importing: {title} | Chapters: {len(chapters)} | Cover: {cover_url} | Category: {category}")
        
        add_book(
            title=title,
            author=author,
            category=category, 
            price=0, 
            cover_path=cover_url,
            file_path=mp3_url,
            description=description,
            narrator="LibriVox Volunteer",
            duration=duration,
            chapters=chapters
        )
        return True
    except Exception as e:
        print(f"Error importing book: {e}")
        raise e
