import re

# Read the app.js file
with open('webapp/js/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the broken renderBooksGrid function pattern to replace
old_function = r'function renderBooksGrid\(booksToRender, container\) \{[^}]+mainContent\.innerHTML = [^;]+;[^}]+renderBooksGrid\(books, document\.getElementById\(\'discover-grid\'\)\);[^}]+const tabs[^}]+forEach[^}]+addEventListener[^}]+forEach[^}]+classList\.remove[^}]+classList\.add[^}]+getAttribute[^}]+filter[^}]+renderBooksGrid[^}]+\}\);[^}]+\}\);[^}]+\}'

# New correct implementation
new_function = '''function renderBooksGrid(booksToRender, container) {
        if (!container) return;
        
        container.innerHTML = booksToRender.map(book => `
            <div class="book-card" onclick="openReader('${book.id}')">
                <img src="${book.coverUrl || 'placeholder.svg'}" alt="${book.title}" class="book-cover" onerror="this.src='placeholder.svg'">
                <div class="book-title">${book.title}</div>
                <div class="book-author">${book.author}</div>
            </div>
        `).join('');
    }'''

# Try pattern replacement
content_new = re.sub(old_function, new_function, content, flags=re.DOTALL)

# If regex didn't work, try simple line-based replacement
if content_new == content:
    lines = content.split('\n')
    new_lines = []
    i = 0
    while i < len(lines):
        # Look for the start of renderBooksGrid function
        if i < len(lines) and 'function renderBooksGrid(booksToRender, container)' in lines[i]:
            # Found it, skip to the closing brace
            new_lines.append('    function renderBooksGrid(booksToRender, container) {')
            new_lines.append('        if (!container) return;')
            new_lines.append('        ')
            new_lines.append('        container.innerHTML = booksToRender.map(book => `')
            new_lines.append('            <div class="book-card" onclick="openReader(\'${book.id}\')">') 
            new_lines.append('                <img src="${book.coverUrl || \'placeholder.svg\'}" alt="${book.title}" class="book-cover" onerror="this.src=\'placeholder.svg\'">') 
            new_lines.append('                <div class="book-title">${book.title}</div>')
            new_lines.append('                <div class="book-author">${book.author}</div>')
            new_lines.append('            </div>')
            new_lines.append('        `).join(\'\');')
            new_lines.append('    }')
            # Skip all lines until we find the closing brace of this function
            i += 1
            brace_count = 1
            while i < len(lines) and brace_count > 0:
                if '{' in lines[i]:
                    brace_count += lines[i].count('{')
                if '}' in lines[i]:
                    brace_count -= lines[i].count('}')
                i += 1
            continue
        new_lines.append(lines[i])
        i += 1
    
    content_new = '\n'.join(new_lines)

# Write the fixed content
with open('webapp/js/app.js', 'w', encoding='utf-8') as f:
    f.write(content_new)

print("Fixed renderBooksGrid function successfully!")
