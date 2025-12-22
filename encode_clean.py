import base64
import os

def encode_file(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"Error: File not found: {input_path}")
        return

    with open(input_path, "rb") as f:
        data = f.read()

    # Encode to bytes and split into 64-char lines
    encoded_bytes = base64.b64encode(data)
    encoded_str = encoded_bytes.decode('utf-8')
    
    chunked = ""
    for i in range(0, len(encoded_str), 64):
        chunked += encoded_str[i:i+64] + "\n"
        
    with open(output_path, "w") as f:
        f.write(chunked)
    
    print(f"Encoded {input_path} -> {output_path} ({len(chunked)} chars)")

encode_file("distribution.p12", "p12_clean.txt")
encode_file("JM_Audiobooks_App_Store.mobileprovision", "profile_clean.txt")
