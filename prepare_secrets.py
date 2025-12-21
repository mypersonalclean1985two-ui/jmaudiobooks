import base64
import os

def generate_secrets():
    print("--- GITHUB SECRETS GENERATOR ---")
    print("Please go to your GitHub Repository -> Settings -> Secrets and variables -> Actions -> New repository secret")
    print("Add the following 3 secrets:\n")

    # 1. P12 File
    if os.path.exists("distribution.p12"):
        with open("distribution.p12", "rb") as f:
            p12_b64 = base64.b64encode(f.read()).decode('utf-8')
            print(f"1. Name: IOS_P12_BASE64")
            print(f"   Value: (Copy the huge string below)")
            print(p12_b64)
            print("-" * 50)
    else:
        print("ERROR: distribution.p12 not found!")

    # 2. Provisioning Profile
    # Find the mobileprovision file (since exact name might vary slightly)
    provision_files = [f for f in os.listdir('.') if f.endswith('.mobileprovision')]
    if provision_files:
        filename = provision_files[0]
        with open(filename, "rb") as f:
            prov_b64 = base64.b64encode(f.read()).decode('utf-8')
            print(f"2. Name: IOS_PROVISION_BASE64")
            print(f"   Value: (Copy the huge string below)")
            print(prov_b64)
            print("-" * 50)
    else:
        print("ERROR: .mobileprovision file not found!")

    # 3. Password
    print(f"3. Name: IOS_P12_PASSWORD")
    print(f"   Value: password")
    print("-" * 50)

if __name__ == "__main__":
    generate_secrets()
