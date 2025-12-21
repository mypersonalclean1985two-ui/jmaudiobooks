from PIL import Image
import os
import shutil

# Paths
base_dir = os.path.dirname(os.path.abspath(__file__))
webapp_dir = os.path.join(base_dir, 'webapp')
icons_dir = os.path.join(webapp_dir, 'icons')
source_icon_path = r'C:/Users/Medicare/.gemini/antigravity/brain/baf192f1-d905-4b59-83d2-5d40811127cf/app_icon_1764592905034.png'

# Ensure directory exists
os.makedirs(icons_dir, exist_ok=True)

# Open source image
try:
    img = Image.open(source_icon_path)
    
    # Resize and save 192x192
    img_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
    img_192.save(os.path.join(icons_dir, 'icon-192.png'))
    print("Created icon-192.png")

    # Resize and save 512x512
    img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    img_512.save(os.path.join(icons_dir, 'icon-512.png'))
    print("Created icon-512.png")

except Exception as e:
    print(f"Error processing icon: {e}")
