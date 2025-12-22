import os

def fix_pbxproj_final():
    path = "ios/App/App.xcodeproj/project.pbxproj"
    if not os.path.exists(path):
        print("Project file not found")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Use the Name instead of UUID for the specifier
    old_uuid = "bc145a22-aaba-4800-9608-e8fd063229c9"
    new_name = "JM Audiobooks App Store"
    
    # Replace all occurrences of the UUID specifier with the Name
    # We look for the pattern PROVISIONING_PROFILE_SPECIFIER = "...";
    content = content.replace(f'PROVISIONING_PROFILE_SPECIFIER = "{old_uuid}";', f'PROVISIONING_PROFILE_SPECIFIER = "{new_name}";')
    
    # Also ensure CODE_SIGN_STYLE is Manual consistently
    content = content.replace('CODE_SIGN_STYLE = Automatic;', 'CODE_SIGN_STYLE = Manual;')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Project file updated: Specifier changed to '{new_name}' and signing set to Manual.")

if __name__ == "__main__":
    fix_pbxproj_final()
