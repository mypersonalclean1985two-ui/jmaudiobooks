import requests

# Test how requests formats list params
params1 = {
    "q": "test",
    "fl": ["identifier", "title"],
    "rows": 5
}

params2 = {
    "q": "test",
    "fl": "identifier,title",  # Comma-separated string instead
    "rows": 5
}

print("With list:")
print(requests.Request('GET', 'http://example.com', params=params1).prepare().url)

print("\nWith comma-separated string:")
print(requests.Request('GET', 'http://example.com', params=params2).prepare().url)
