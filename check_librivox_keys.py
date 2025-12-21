import requests
import json

def check_keys():
    url = "https://librivox.org/api/feed/audiobooks/?format=json&limit=1"
    try:
        data = requests.get(url).json()
        book = data['books'][0]
        print("Keys found:", book.keys())
        print("Zip URL:", book.get('url_zip_file'))
        print("RSS URL:", book.get('url_rss'))
        print("LibriVox URL:", book.get('url_librivox'))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_keys()
