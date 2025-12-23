import os
import shutil
import zipfile

# Source paths (from artifacts)
ASSETS = {
    "App_Icon_1024.png": r"C:\Users\Medicare\.gemini\antigravity\brain\1825ccd1-9412-44e6-a21e-ca22420df272\app_icon_1024_1766497965238.png",
    "Screenshot_1_Home.png": r"C:\Users\Medicare\.gemini\antigravity\brain\1825ccd1-9412-44e6-a21e-ca22420df272\app_store_home_screen_1766480469402.png",
    "Screenshot_2_Discover.png": r"C:\Users\Medicare\.gemini\antigravity\brain\1825ccd1-9412-44e6-a21e-ca22420df272\discover_screenshot_1766497904558.png",
    "Screenshot_3_Player.png": r"C:\Users\Medicare\.gemini\antigravity\brain\1825ccd1-9412-44e6-a21e-ca22420df272\app_store_player_screen_1766480508846.png"
}

OUTPUT_DIR = r"C:\Users\Medicare\Desktop\Applications\Books app\JM_Audiobooks_AppStore_Assets"
ZIP_FILE = r"C:\Users\Medicare\Desktop\Applications\Books app\JM_Audiobooks_AppStore_Assets.zip"

def create_distribution_zip():
    # 1. Create directory
    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR)
    os.makedirs(OUTPUT_DIR)

    # 2. Copy and rename files
    for new_name, src_path in ASSETS.items():
        dst_path = os.path.join(OUTPUT_DIR, new_name)
        try:
            if os.path.exists(src_path):
                shutil.copy2(src_path, dst_path)
                print(f"Copied: {new_name}")
            else:
                print(f"MISSING: {src_path}")
        except Exception as e:
            print(f"Error copying {new_name}: {e}")

    # 3. Zip IT
    with zipfile.ZipFile(ZIP_FILE, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(OUTPUT_DIR):
            for file in files:
                zipf.write(os.path.join(root, file), file)
    
    print(f"SUCCESS. Zip created at: {ZIP_FILE}")

if __name__ == "__main__":
    create_distribution_zip()
