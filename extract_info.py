import re
from cryptography import x509
from cryptography.hazmat.backends import default_backend

def extract_cert_cn():
    try:
        with open("distribution.cer", "rb") as f:
            cert_data = f.read()
            cert = x509.load_der_x509_certificate(cert_data, default_backend())
            subject = cert.subject
            # Extract CN
            cn = subject.get_attributes_for_oid(x509.NameOID.COMMON_NAME)[0].value
            print(f"CERT_CN: {cn}")
            print(f"CERT_SUBJECT: {subject}")
    except Exception as e:
        print(f"Error reading cert: {e}")

def extract_uuid():
    try:
        with open("JM_Audiobooks_App_Store.mobileprovision", "rb") as f:
            data = f.read()
            # Simple regex to find UUID in plist content (utf-8 or ascii mostly works even in binary plist if it's text-based inside)
            # Binary plist might be harder, but let's try regex on bytes first.
            # Usually mobileprovision is a CMS signature around a text plist.
            match = re.search(b'<key>UUID</key>\s*<string>([A-F0-9-]+)</string>', data, re.IGNORECASE)
            if match:
                uuid = match.group(1).decode('utf-8')
                print(f"PROFILE_UUID: {uuid}")
            else:
                print("UUID not found via regex.")
    except Exception as e:
        print(f"Error reading profile: {e}")

if __name__ == "__main__":
    with open("info.txt", "w") as f:
        try:
            # Cert
            with open("distribution.cer", "rb") as cf:
                cert_data = cf.read()
                cert = x509.load_der_x509_certificate(cert_data, default_backend())
                subject = cert.subject
                cn = subject.get_attributes_for_oid(x509.NameOID.COMMON_NAME)[0].value
                f.write(f"CERT_CN={cn}\n")
        except Exception as e:
            f.write(f"CERT_ERROR={e}\n")

        try:
            # UUID
            with open("JM_Audiobooks_App_Store.mobileprovision", "rb") as pf:
                data = pf.read()
                match = re.search(b'<key>UUID</key>\s*<string>([A-F0-9-]+)</string>', data, re.IGNORECASE)
                if match:
                    uuid = match.group(1).decode('utf-8')
                    f.write(f"PROFILE_UUID={uuid}\n")
                else:
                    f.write("PROFILE_UUID=NOT_FOUND\n")
        except Exception as e:
            f.write(f"PROFILE_ERROR={e}\n")

