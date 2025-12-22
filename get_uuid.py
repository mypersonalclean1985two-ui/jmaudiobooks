import re
import os

def find_uuid():
    path = "signing/JM_Audiobooks_App_Store.mobileprovision"
    if not os.path.exists(path):
        print("File not found")
        return
        
    with open(path, 'rb') as f:
        content = f.read().decode('latin-1')
    
    # Find UUID tag content
    match = re.search(r'<key>UUID</key>\s*<string>([^<]+)</string>', content)
    if match:
        print(f"UUID Found: {match.group(1)}")
    else:
        print("UUID not found")

find_uuid()
