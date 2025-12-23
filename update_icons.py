from PIL import Image
import os

SOURCE_ICON = r"C:\Users\Medicare\.gemini\antigravity\brain\1825ccd1-9412-44e6-a21e-ca22420df272\app_icon_1024_1766497965238.png"
DEST_DIR = r"c:\Users\Medicare\Desktop\Applications\Books app\webapp\icons"

SIZES = {
    "icon-192.png": (192, 192),
    "icon-512.png": (512, 512)
}

def update_icons():
    if not os.path.exists(SOURCE_ICON):
        print(f"Error: Source icon not found at {SOURCE_ICON}")
        return

    try:
        img = Image.open(SOURCE_ICON)
        # Ensure RGBA for transparency support if needed, though app icons usually solid
        img = img.convert("RGBA")
        
        for filename, size in SIZES.items():
            dest_path = os.path.join(DEST_DIR, filename)
            # High quality resize
            resized = img.resize(size, Image.Resampling.LANCZOS)
            resized.save(dest_path, "PNG")
            print(f"Updated {filename} ({size}) at {dest_path}")
            
    except Exception as e:
        print(f"Failed to update icons: {e}")

if __name__ == "__main__":
    update_icons()
