import base64

# The NEW key content provided by the user (ApiKey_XZFPOWFFE4ZQ.p8)
private_key = """-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgoUAgYPjmIl0BjVyO
qMJ+eQZEhB6SJ4Z+bB/RjSA7iLKhRANCAARlBtuG0dPNF/2S3gCvbiTpyrUGgF4a
qiY1huBIJhnOU3rnf+QxbXPm5x4edFEr5fptWT4v0clTuvaCIrd5SRTm
-----END PRIVATE KEY-----"""

# Encode to Base64
encoded_key = base64.b64encode(private_key.encode('utf-8')).decode('utf-8')

print("Copy the single line below (it is one long string):")
print("-" * 20)
print(encoded_key)
print("-" * 20)

# Also write to a file for easy copying
with open("key_for_github.txt", "w") as f:
    f.write(encoded_key)
