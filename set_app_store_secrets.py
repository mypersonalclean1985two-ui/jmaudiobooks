import subprocess
import os

key_id = "42KRTWG257"
issuer_id = "4011d22d-951f-4c90-b615-dc9f657de4d0"
private_key = """-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgvdcb0N9tLZnpRTXq
3fktvGjQdDJfQUCrsQION9KyUVegCgYIKoZIzj0DAQehRANCAAS0hF6nvra87Qaf
AZphZWanILZOlUOPlEg/5DPuIkj8cHZceSEJzjxu7c4IUy0D23OE17+iP4v3pdIG
CX/6pkMT
-----END PRIVATE KEY-----"""

secrets = {
    "APP_STORE_KEY_ID": key_id,
    "APP_STORE_ISSUER_ID": issuer_id,
    "APP_STORE_PRIVATE_KEY": private_key
}

def set_secret(name, value):
    try:
        # Use subprocess to pipe the value to gh secret set
        process = subprocess.Popen(
            ["gh", "secret", "set", name],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            shell=True 
        )
        stdout, stderr = process.communicate(input=value)
        if process.returncode == 0:
            print(f"Successfully set secret: {name}")
        else:
            print(f"Failed to set secret {name}: {stderr}")
    except Exception as e:
        print(f"Error setting secret {name}: {e}")

if __name__ == "__main__":
    print("Setting GitHub Secrets...")
    for name, value in secrets.items():
        set_secret(name, value)
    print("Done.")
