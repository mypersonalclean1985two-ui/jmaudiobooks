import requests
import json

def check_genres_and_pagination():
    # Test 1: Get list of genres? The API documentation might be needed, but let's try to find a genre field in a book first.
    # Test 2: Pagination with limit and offset
    
    print("--- Testing Pagination ---")
    url = "https://librivox.org/api/feed/audiobooks/?format=json&limit=5&offset=5"
    try:
        data = requests.get(url).json()
        print(f"Books found: {len(data.get('books', []))}")
        if data.get('books'):
            print(f"First book: {data['books'][0]['title']}")
    except Exception as e:
        print(f"Pagination Error: {e}")

    print("\n--- Testing Genre Search ---")
    # Try searching by genre/subject. Common parameter is 'genre' or 'subject'.
    # Let's try 'genre=Mystery'
    url = "https://librivox.org/api/feed/audiobooks/?format=json&genre=Mystery&limit=2"
    try:
        data = requests.get(url).json()
        if data.get('books'):
            print(f"Genre 'Mystery' result: {data['books'][0]['title']}")
        else:
            print("Genre 'Mystery' returned no results.")
    except Exception as e:
        print(f"Genre Error: {e}")

if __name__ == "__main__":
    check_genres_and_pagination()
