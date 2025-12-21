import requests
import json

def get_genres():
    url = "https://librivox.org/api/feed/genres/?format=json"
    try:
        response = requests.get(url)
        data = response.json()
        print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    get_genres()
