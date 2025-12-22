/**
 * JM Audiobooks - Category Utilities
 * Handles book filtering and category management
 */

window.CategoryUtils = {
    /**
     * Filters books based on category
     * @param {Array} books List of book objects
     * @param {string} category Category name or 'all'
     * @returns {Array} Filtered list of books
     */
    filterBooks: function (books, category) {
        if (!category || category === 'all') return books;
        return books.filter(book => book.category === category);
    },

    /**
     * Gets a unique list of categories from the books data
     * @param {Array} books List of book objects
     * @returns {Array} List of category strings
     */
    getAllCategories: function (books) {
        const categories = new Set();
        books.forEach(book => {
            if (book.category) categories.add(book.category);
        });
        return Array.from(categories).sort();
    }
};
