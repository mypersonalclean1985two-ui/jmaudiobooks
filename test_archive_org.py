import requests
import json

def search_internet_archive(query):
    # Internet Archive Advanced Search
    # q: query
    # fl: fields to return
    # rows: limit
    # output: json
    base_url = "https://archive.org/advancedsearch.php"
    params = {
        "q": f"collection:librivoxaudio AND subject:{query}",
        "fl": ["identifier", "title", "creator", "description", "subject", "downloads"],
        "rows": 5,
        "output": "json"
    }
    try:
        response = requests.get(base_url, params=params)
        data = response.json()
        print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    search_internet_archive("mystery")
