import requests
import json

def search_librivox(query):
    url = f"https://librivox.org/api/feed/audiobooks/?format=json&title={query}"
    try:
        response = requests.get(url)
        data = response.json()
        print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    search_librivox("Sherlock Holmes")
