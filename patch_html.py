import re

# Read the file
with open('webapp/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add ID to subscription modal title
content = re.sub(
    r'<h2 class="modal-title" style="margin-bottom: 4px; font-size: 1\.3rem;">Unlock Everything</h2>',
    r'<h2 class="modal-title" id="subscription-modal-title" style="margin-bottom: 4px; font-size: 1.3rem;">Unlock Everything</h2>',
    content
)

# Add debug overlay script before main app.js
content = re.sub(
    r'(\s+<!-- Main Application Logic -->)',
    r'\n    <!-- Debug Overlay for IAP Debugging (No Mac Required) -->\n    <script src="js/debug-overlay.js?v=1.0"></script>\n\1',
    content
)

# Write back
with open('webapp/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Updated index.html with debug overlay")
