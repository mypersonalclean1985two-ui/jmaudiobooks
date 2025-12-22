import time
import jwt
import requests
import sys

# Secrets found in local files
KEY_ID = "42KRTWG257"
ISSUER_ID = "4011d22d-951f-4c90-b615-dc9f657de4d0"
PRIVATE_KEY = """-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgvdcb0N9tLZnpRTXq
3fktvGjQdDJfQUCrsQION9KyUVegCgYIKoZIzj0DAQehRANCAAS0hF6nvra87Qaf
AZphZWanILZOlUOPlEg/5DPuIkj8cHZceSEJzjxu7c4IUy0D23OE17+iP4v3pdIG
CX/6pkMT
-----END PRIVATE KEY-----"""

ALGORITHM = 'ES256'
BASE_API = 'https://api.appstoreconnect.apple.com/v1'

def create_token():
    exp = int(time.time()) + 20 * 60
    headers = {
        'alg': ALGORITHM,
        'kid': KEY_ID,
        'typ': 'JWT'
    }
    payload = {
        'iss': ISSUER_ID,
        'exp': exp,
        'aud': 'appstoreconnect-v1'
    }
    token = jwt.encode(payload, PRIVATE_KEY, algorithm=ALGORITHM, headers=headers)
    return token

def revoke_certificates():
    print(f"Authenticating with Key ID: {KEY_ID}...")
    try:
        token = create_token()
    except Exception as e:
        print(f"Error creating token: {e}")
        return

    headers = {
        'Authorization': f'Bearer {token}', 
        'Content-Type': 'application/json'
    }

    # Step 1: List certificates
    print("Fetching certificates...")
    try:
        # Filter for DISTRIBUTION certificates
        response = requests.get(f"{BASE_API}/certificates?filter[certificateType]=IOS_DISTRIBUTION", headers=headers)
        if response.status_code != 200:
            print(f"Failed to fetch certificates: {response.text}")
            return
        
        data = response.json()
        certs = data.get('data', [])
        print(f"Found {len(certs)} distribution certificates.")

        if not certs:
            print("No certificates to revoke.")
            return

        # Step 2: Revoke one by one
        for cert in certs:
            cert_id = cert['id']
            name = cert['attributes'].get('name', 'Unknown')
            print(f"Revoking certificate: {name} ({cert_id})...")
            
            del_response = requests.delete(f"{BASE_API}/certificates/{cert_id}", headers=headers)
            if del_response.status_code == 204:
                print(" -> Success.")
            else:
                print(f" -> Failed: {del_response.text}")
                
        print("\nAll done! You can now rebuild in CodeMagic.")

    except Exception as e:
        print(f"Network error: {e}")

if __name__ == "__main__":
    revoke_certificates()
