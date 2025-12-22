import base64
import os

def verify(original, clean_txt):
    if not os.path.exists(original):
        print(f"Original file not found: {original}")
        return
    if not os.path.exists(clean_txt):
        print(f"Clean text file not found: {clean_txt}")
        return
        
    with open(original, "rb") as f:
        orig_bytes = f.read()
        
    with open(clean_txt, "r") as f:
        encoded_str = f.read().strip().replace("\n", "")
        
    try:
        decoded_bytes = base64.b64decode(encoded_str)
    except Exception as e:
        print(f"Decoding failed: {e}")
        return

    if orig_bytes == decoded_bytes:
        print(f"SUCCESS: {clean_txt} decodes exactly to {original}")
    else:
        print(f"FAILURE: Content mismatch! Original: {len(orig_bytes)} bytes, Decoded: {len(decoded_bytes)} bytes")
        # Print first few bytes mismatch
        print(f"Original start: {orig_bytes[:20]}")
        print(f"Decoded start:  {decoded_bytes[:20]}")

verify("distribution.p12", "p12_clean.txt")
verify("JM_Audiobooks_App_Store.mobileprovision", "profile_clean.txt")
