import json
import os
from PIL import Image, ImageDraw, ImageFont
import random

# Load books data
with open('data/books.json', 'r') as f:
    books = json.load(f)

# Ensure covers directory exists
os.makedirs('data/covers', exist_ok=True)

# Color palettes for different categories
color_palettes = {
    'Fiction': [(255, 107, 107), (255, 159, 64)],
    'Sci-Fi': [(72, 52, 212), (88, 86, 214)],
    'Mystery': [(52, 73, 94), (44, 62, 80)],
    'Romance': [(255, 118, 117), (253, 121, 168)],
    'Business': [(26, 188, 156), (22, 160, 133)],
    'Self-Help': [(52, 152, 219), (41, 128, 185)],
    'Technology': [(155, 89, 182), (142, 68, 173)],
    'History': [(211, 84, 0), (230, 126, 34)],
    'Biography': [(108, 92, 231), (98, 82, 221)],
    'Fantasy': [(156, 39, 176), (142, 36, 170)],
}

def generate_cover(book, output_path):
    """Generate a book cover image"""
    width, height = 400, 600
    
    # Get color palette based on category
    category = book.get('category', 'Fiction')
    if category in color_palettes:
        color1, color2 = color_palettes[category]
    else:
        color1 = (random.randint(50, 200), random.randint(50, 200), random.randint(50, 200))
        color2 = (random.randint(50, 200), random.randint(50, 200), random.randint(50, 200))
    
    # Create gradient background
    img = Image.new('RGB', (width, height), color1)
    draw = ImageDraw.Draw(img)
    
    # Draw gradient
    for i in range(height):
        ratio = i / height
        r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
        g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
        b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
        draw.line([(0, i), (width, i)], fill=(r, g, b))
    
    # Add decorative elements
    draw.rectangle([20, 20, width-20, height-20], outline=(255, 255, 255), width=3)
    
    # Try to load a font, fallback to default if not available
    try:
        title_font = ImageFont.truetype("arial.ttf", 48)
        author_font = ImageFont.truetype("arial.ttf", 28)
        category_font = ImageFont.truetype("arial.ttf", 20)
    except:
        title_font = ImageFont.load_default()
        author_font = ImageFont.load_default()
        category_font = ImageFont.load_default()
    
    # Draw title (word wrap)
    title = book['title']
    words = title.split()
    lines = []
    current_line = []
    
    for word in words:
        test_line = ' '.join(current_line + [word])
        bbox = draw.textbbox((0, 0), test_line, font=title_font)
        if bbox[2] - bbox[0] < width - 80:
            current_line.append(word)
        else:
            if current_line:
                lines.append(' '.join(current_line))
            current_line = [word]
    if current_line:
        lines.append(' '.join(current_line))
    
    # Draw title lines
    y_offset = height // 3
    for line in lines[:3]:  # Max 3 lines
        bbox = draw.textbbox((0, 0), line, font=title_font)
        text_width = bbox[2] - bbox[0]
        x = (width - text_width) // 2
        draw.text((x, y_offset), line, fill=(255, 255, 255), font=title_font)
        y_offset += 60
    
    # Draw author
    author = book['author']
    bbox = draw.textbbox((0, 0), author, font=author_font)
    text_width = bbox[2] - bbox[0]
    x = (width - text_width) // 2
    draw.text((x, height - 120), author, fill=(255, 255, 255), font=author_font)
    
    # Draw category badge
    category_text = category.upper()
    bbox = draw.textbbox((0, 0), category_text, font=category_font)
    badge_width = bbox[2] - bbox[0] + 20
    badge_x = (width - badge_width) // 2
    draw.rectangle([badge_x, 50, badge_x + badge_width, 80], fill=(255, 255, 255, 128))
    draw.text((badge_x + 10, 55), category_text, fill=color1, font=category_font)
    
    # Save image
    img.save(output_path, 'PNG')
    print(f"Generated cover: {output_path}")

# Generate covers for all books
for book in books:
    cover_filename = book['cover'].replace('covers/', '')
    output_path = f"data/covers/{cover_filename}"
    generate_cover(book, output_path)

print(f"\nGenerated {len(books)} book covers!")
