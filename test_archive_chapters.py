import requests
import json

def check_book_chapters(identifier):
    print(f"Checking metadata for: {identifier}")
    url = f"https://archive.org/metadata/{identifier}"
    try:
        response = requests.get(url)
        data = response.json()
        
        files = data.get('files', [])
        mp3_files = []
        
        print(f"Total files found: {len(files)}")
        
        for file in files:
            if file.get('format') in ['VBR MP3', '128Kbps MP3', '64Kbps MP3']:
                mp3_files.append(file)
                
        print(f"MP3 files found: {len(mp3_files)}")
        
        # Sort by track number if possible, or name
        # Archive.org files usually have 'track' or 'title' fields
        mp3_files.sort(key=lambda x: x.get('name'))
        
        for i, f in enumerate(mp3_files[:5]): # Print first 5
            print(f"  [{i+1}] Name: {f.get('name')} | Title: {f.get('title')} | Track: {f.get('track')} | Length: {f.get('length')}")
            
        if len(mp3_files) > 5:
            print(f"  ... and {len(mp3_files) - 5} more.")
            
    except Exception as e:
        print(f"Error: {e}")

# Test with a known LibriVox ID (e.g., one from the DB or a common one like 'pride_and_prejudice_librivox')
# Using the ID found in the previous check_db output: 3YnaZHKoMKKcz5V8Cu (Wait, that's a Firestore ID)
# I need a real Archive.org identifier. 
# Let's search for one first.

def search_and_check():
    search_url = "https://archive.org/advancedsearch.php"
    params = {
        "q": "collection:librivoxaudio AND title:(Pride and Prejudice)",
        "fl": "identifier,title",
        "rows": 1,
        "output": "json"
    }
    try:
        resp = requests.get(search_url, params=params)
        docs = resp.json().get('response', {}).get('docs', [])
        if docs:
            identifier = docs[0]['identifier']
            print(f"Found book: {docs[0]['title']} (ID: {identifier})")
            check_book_chapters(identifier)
        else:
            print("No book found to test.")
    except Exception as e:
        print(f"Search Error: {e}")

if __name__ == "__main__":
    search_and_check()
