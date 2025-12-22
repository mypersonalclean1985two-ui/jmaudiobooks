import os

def fix_pbxproj():
    path = "ios/App/App.xcodeproj/project.pbxproj"
    if not os.path.exists(path):
        print("Project file not found")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update the Provisioning Profile UUID
    old_uuid = "bc145a22-9608-4800-8fd0-663229c94131"
    new_uuid = "bc145a22-aaba-4800-9608-e8fd063229c9"
    content = content.replace(old_uuid, new_uuid)
    print(f"Patched UUID: {old_uuid} -> {new_uuid}")

    # 2. Update the Bundle Identifier (ensure both Debug/Release match)
    old_bundle = "com.jmaudiobooks.app"
    new_bundle = "com.jmaudiobooks.jmaudiobooks"
    content = content.replace(old_bundle, new_bundle)
    print(f"Patched Bundle ID: {old_bundle} -> {new_bundle}")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Project file updated successfully.")

if __name__ == "__main__":
    fix_pbxproj()
