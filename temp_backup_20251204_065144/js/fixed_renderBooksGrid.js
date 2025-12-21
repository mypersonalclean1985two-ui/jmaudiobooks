function renderBooksGrid(booksToRender, container) {
    if (!container) return;

    container.innerHTML = booksToRender.map(book => `
        <div class="book-card" onclick="openReader('${book.id}')">
            <img src="${book.coverUrl || 'placeholder.svg'}" alt="${book.title}" class="book-cover" onerror="this.src='placeholder.svg'">
            <div class="book-title">${book.title}</div>
            <div class="book-author">${book.author}</div>
        </div>
    `).join('');
}
