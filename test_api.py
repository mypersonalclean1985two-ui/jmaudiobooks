import urllib.request
import json
import urllib.error

BASE_URL = "http://localhost:5000/api"

def test_get_books():
    try:
        with urllib.request.urlopen(f"{BASE_URL}/books") as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                print(f"GET /books: Success. Found {len(data)} books.")
                if len(data) > 0:
                    print(f"Sample book: {data[0]['title']}")
            else:
                print(f"GET /books: Failed. Status: {response.status}")
    except Exception as e:
        print(f"GET /books: Error - {e}")

def test_login():
    try:
        url = f"{BASE_URL}/login"
        payload = json.dumps({"username": "admin", "password": "admin123"}).encode('utf-8')
        req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
        
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                if data.get("success"):
                    print("POST /login: Success. Logged in as admin.")
                else:
                    print(f"POST /login: Failed. Message: {data.get('message')}")
            else:
                print(f"POST /login: Failed. Status: {response.status}")
    except urllib.error.HTTPError as e:
         print(f"POST /login: Failed. HTTP Error: {e.code}")
    except Exception as e:
        print(f"POST /login: Error - {e}")

if __name__ == "__main__":
    test_get_books()
    test_login()
