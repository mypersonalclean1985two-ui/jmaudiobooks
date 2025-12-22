import base64
import os

key_path = r"c:\Users\Medicare\Desktop\Applications\Books app\ApiKey_XZFPOWFFE4ZQ.p8"

with open(key_path, "rb") as f:
    key_data = f.read()
    # Strip any leading/trailing whitespace but keep internal format
    # Actually, .p8 files usually have specific line breaks. 
    # Let's just encode the raw bytes to be 100% safe.
    encoded = base64.b64encode(key_data).decode('utf-8')
    with open("base64_key.txt", "w") as out:
        out.write(encoded)
    print("Encoded key written to base64_key.txt")
