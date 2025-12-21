import requests
import json

# Test the exact query we're using in the admin panel
def test_archive_search():
    query = "mystery"
    search_query = f"collection:librivoxaudio AND (title:({query}) OR subject:({query}))"
    
    params = {
        "q": search_query,
        "fl": ["identifier", "title", "creator", "description", "subject", "downloads"],
        "rows": 5,
        "page": 1,
        "output": "json",
        "sort": ["downloads desc"]
    }
    
    url = "https://archive.org/advancedsearch.php"
    
    print(f"URL: {url}")
    print(f"Query: {search_query}")
    print(f"Params: {json.dumps(params, indent=2)}")
    print("\nSending request...")
    
    try:
        response = requests.get(url, params=params)
        print(f"Status Code: {response.status_code}")
        print(f"Response URL: {response.url}")
        
        data = response.json()
        print(f"\nResponse Keys: {data.keys()}")
        
        if 'response' in data:
            docs = data['response'].get('docs', [])
            print(f"Number of results: {len(docs)}")
            
            if docs:
                print("\nFirst result:")
                print(json.dumps(docs[0], indent=2))
            else:
                print("No documents found")
        else:
            print("Unexpected response structure")
            print(json.dumps(data, indent=2))
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_archive_search()
