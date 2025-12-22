import os
import re

def check_match():
    p12_path = "signing/distribution.p12"
    provision_path = "signing/JM_Audiobooks_App_Store.mobileprovision"
    
    if not os.path.exists(p12_path):
        print(f"Error: {p12_path} not found.")
        return
    if not os.path.exists(provision_path):
        print(f"Error: {provision_path} not found.")
        return

    # 1. Read Provisioning Profile and look for suspicious strings
    with open(provision_path, 'rb') as f:
        prof_data = f.read()
        
    # Look for the Team ID in the profile (Simple string check)
    team_id = b"QY25P2CW87"
    if team_id in prof_data:
        print(f"✅ Profile contains Team ID: {team_id.decode()}")
    else:
        print(f"❌ Profile DOES NOT contain Team ID: {team_id.decode()}")

    # 2. Check for App ID
    app_id = b"com.jmaudiobooks.jmaudiobooks"
    if app_id in prof_data:
        print(f"✅ Profile contains App ID: {app_id.decode()}")
    else:
        print(f"❌ Profile DOES NOT contain App ID: {app_id.decode()}")
        # Check if it has the wildcard or other ID
        if b"com.jmaudiobooks.*" in prof_data:
             print(f"⚠️ Profile contains Wildcard App ID.")
    
    # 3. Check for specific strings from the Certificate Subject we saw earlier
    # Subject: CN=Apple Distribution: Saba Rehmat (QY25P2CW87)
    # The profile stores the CERTIFICATE itself (DER encoded). 
    # It might contain the string "Saba Rehmat" if it's in the cert subject.
    cert_name = b"Saba Rehmat"
    if cert_name in prof_data:
        print(f"✅ Profile contains Certificate Name: {cert_name.decode()}")
    else:
        print(f"❌ Profile DOES NOT contain Certificate Name: {cert_name.decode()}")

    print("\nResult: If checks passed, the files are likely a valid pair.")

if __name__ == "__main__":
    check_match()
