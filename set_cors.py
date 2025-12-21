import firebase_admin
from firebase_admin import credentials, storage
import os

# Initialize Firebase Admin
cred_path = 'serviceAccountKey.json'
cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred, {
    'storageBucket': 'book-258ee.firebasestorage.app'
})

bucket = storage.bucket()

# Define CORS configuration
cors_configuration = [
    {
        "origin": ["*"],
        "method": ["GET"],
        "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
        "maxAgeSeconds": 3600
    }
]

# Set CORS configuration
bucket.cors = cors_configuration
bucket.patch()

print("CORS configuration set successfully for bucket:", bucket.name)
