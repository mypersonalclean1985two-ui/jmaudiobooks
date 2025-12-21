#!/usr/bin/env python3
"""
Import books from books.json to Firestore database.
This script reads books from data/books.json and uploads them to the 'books' collection in Firestore.
"""

import json
import firebase_admin
from firebase_admin import credentials, firestore

def main():
    # Initialize Firebase
    cred = credentials.Certificate('serviceAccountKey.json')
    firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    
    # Read books from JSON file
    with open('data/books.json', 'r', encoding='utf-8') as f:
        books = json.load(f)
    
    print(f"Found {len(books)} books in data/books.json")
    
    # Import each book to Firestore
    imported_count = 0
    for book in books:
        try:
            # Transform data to match web app structure
            book_data = {
                'title': book.get('title', ''),
                'author': book.get('author', ''),
                'category': book.get('category', ''),
                'description': book.get('description', ''),
                'price': book.get('price', 0),
                # Convert cover and file paths to URLs (these will be placeholder for now)
                'coverUrl': f"covers/{book.get('cover', 'placeholder.svg')}",
                'fileUrl': f"files/{book.get('file', '')}",
                'rating': 4.5,  # Default rating
                'duration': '3h 24m'  # Placeholder duration
            }
            
            # Use the book ID from JSON or generate one
            book_id = book.get('id', str(imported_count + 1))
            
            # Add to Firestore
            db.collection('books').document(book_id).set(book_data)
            print(f"✓ Imported: {book_data['title']}")
            imported_count += 1
            
        except Exception as e:
            print(f"✗ Error importing {book.get('title', 'unknown')}: {e}")
    
    print(f"\n{'='*50}")
    print(f"Import complete! Imported {imported_count}/{len(books)} books to Firestore.")
    print(f"{'='*50}")

if __name__ == '__main__':
    main()
