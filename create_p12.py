from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography import x509
import os

def create_p12():
    # Load the Private Key
    with open("private_key.pem", "rb") as f:
        private_key = serialization.load_pem_private_key(
            f.read(),
            password=None
        )
    print("Loaded private_key.pem")

    # Load the Certificate (DER format from Apple)
    with open("distribution.cer", "rb") as f:
        cert_data = f.read()
        try:
            # Apple usually provides DER encoded certs
            cert = x509.load_der_x509_certificate(cert_data)
        except ValueError:
            # Fallback if it's PEM (unlikely but possible)
            f.seek(0)
            cert = x509.load_pem_x509_certificate(cert_data)
    print("Loaded distribution.cer")

    # Create P12
    p12 = pkcs12.serialize_key_and_certificates(
        name=b"JM Audiobooks Distribution",
        key=private_key,
        cert=cert,
        cas=None,
        encryption_algorithm=serialization.BestAvailableEncryption(b"password") # Password is 'password'
    )

    # Write P12
    with open("distribution.p12", "wb") as f:
        f.write(p12)
    print("Created distribution.p12 with password 'password'")

if __name__ == "__main__":
    create_p12()
