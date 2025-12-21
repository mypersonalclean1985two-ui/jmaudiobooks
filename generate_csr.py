from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import hashes
from cryptography.x509.oid import NameOID
from cryptography import x509

def generate_csr():
    # Generate private key
    key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )

    # Write private key to file
    with open("private_key.pem", "wb") as f:
        f.write(key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        ))
    print("Generated private_key.pem")

    # Generate CSR
    csr = x509.CertificateSigningRequestBuilder().subject_name(x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, u"JM Audiobooks"),
        x509.NameAttribute(NameOID.EMAIL_ADDRESS, u"ianballentyne1@gmail.com"),
        x509.NameAttribute(NameOID.COUNTRY_NAME, u"US"),
    ])).sign(key, hashes.SHA256())

    # Write CSR to file
    with open("CertificateSigningRequest.certSigningRequest", "wb") as f:
        f.write(csr.public_bytes(serialization.Encoding.PEM))
    print("Generated CertificateSigningRequest.certSigningRequest")

if __name__ == "__main__":
    generate_csr()
