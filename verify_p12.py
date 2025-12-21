
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.hazmat.primitives import serialization

p12_password = b"password"

try:
    with open("distribution.p12", "rb") as f:
        p12_data = f.read()
    
    # Attempt to load the PKCS12 file (this checks the password)
    private_key, certificate, additional_certificates = pkcs12.load_key_and_certificates(
        p12_data,
        p12_password
    )
    print("SUCCESS: distribution.p12 successfully unlocked with password 'password'")
except Exception as e:
    print(f"FAILURE: Could not unlock P12. Error: {e}")
