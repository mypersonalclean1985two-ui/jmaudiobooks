import re
import os

def extract_profile_info():
    path = "signing/JM_Audiobooks_App_Store.mobileprovision"
    if not os.path.exists(path):
        print("File not found")
        return
        
    with open(path, 'rb') as f:
        content = f.read().decode('latin-1')
    
    # Find UUID
    uuid_match = re.search(r'<key>UUID</key>\s*<string>([^<]+)</string>', content)
    # Find Name
    name_match = re.search(r'<key>Name</key>\s*<string>([^<]+)</string>', content)
    # Find Team Identifier
    team_match = re.search(r'<key>TeamIdentifier</key>\s*<array>\s*<string>([^<]+)</string>', content)
    
    print(f"UUID: {uuid_match.group(1) if uuid_match else 'Not found'}")
    print(f"Name: {name_match.group(1) if name_match else 'Not found'}")
    print(f"Team ID: {team_match.group(1) if team_match else 'Not found'}")

if __name__ == "__main__":
    extract_profile_info()
