import json
import requests
import google.auth.transport.requests
from google.oauth2 import service_account

def deploy_rules():
    try:
        # 1. Load Credentials
        print("Loading credentials...")
        cred = service_account.Credentials.from_service_account_file(
            'serviceAccountKey.json',
            scopes=['https://www.googleapis.com/auth/cloud-platform']
        )
        
        # Get Access Token
        auth_req = google.auth.transport.requests.Request()
        cred.refresh(auth_req)
        access_token = cred.token
        project_id = cred.project_id
        
        print(f"Authenticated for project: {project_id}")

        # 2. Read Rules File
        print("Reading firestore.rules...")
        with open('firestore.rules', 'r') as f:
            rules_content = f.read()

        # 3. Create Ruleset
        print("Creating new Ruleset...")
        create_url = f"https://firebaserules.googleapis.com/v1/projects/{project_id}/rulesets"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "source": {
                "files": [
                    {
                        "name": "firestore.rules",
                        "content": rules_content
                    }
                ]
            }
        }
        
        response = requests.post(create_url, headers=headers, json=payload)
        if response.status_code != 200:
            print(f"Error creating ruleset: {response.text}")
            return
            
        ruleset_name = response.json()['name']
        print(f"Ruleset created: {ruleset_name}")

        # 4. Update Release
        print("Updating Release...")
        release_name = f"projects/{project_id}/releases/cloud.firestore"
        update_url = f"https://firebaserules.googleapis.com/v1/{release_name}"
        
        payload = {
            "name": release_name,
            "rulesetName": ruleset_name
        }
        
        response = requests.put(update_url, headers=headers, json=payload)
        
        if response.status_code == 200:
            print("SUCCESS: Firestore security rules updated successfully!")
        else:
            print(f"Error updating release: {response.text}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    deploy_rules()
