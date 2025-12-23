/**
 * JM Audiobooks - UX & Category Enhancement
 * Handles horizontal scrolling, touch drag, and navigation flow
 */

window.CategoryEnhance = {
    /**
     * Initializes horizontal scrolling with drag support
     * @param {string} selector CSS selector for the containers
     */
    initHorizontalScroll: function (selector) {
        const containers = document.querySelectorAll(selector);

        containers.forEach(container => {
            let isDown = false;
            let startDate;
            let startX;
            let scrollLeft;

            container.addEventListener('mousedown', (e) => {
                isDown = true;
                container.classList.add('active');
                startX = e.pageX - container.offsetLeft;
                scrollLeft = container.scrollLeft;
                startDate = new Date();
            });

            container.addEventListener('mouseleave', () => {
                isDown = false;
                container.classList.remove('active');
            });

            container.addEventListener('mouseup', () => {
                isDown = false;
                container.classList.remove('active');
            });

            container.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - container.offsetLeft;
                const walk = (x - startX) * 2; // Scroll speed multiplier
                container.scrollLeft = scrollLeft - walk;
            });

            // Touch support is native, but we can enhance it with scroll-snap
            container.style.scrollSnapType = 'x mandatory';
        });
    },

    /**
     * Adds a back button to the view header
     * @param {string} title Page title to display
     * @param {Function} onBack Function to call when back is clicked
     */
    renderBackButton: function (title, onBack) {
        const topBar = document.querySelector('.top-bar');
        if (!topBar) return;

        // Clear existing top bar content or prepend
        const backContainer = document.createElement('div');
        backContainer.className = 'nav-back-container';
        backContainer.innerHTML = `
            <button class="nav-back-btn" id="nav-back-button">←</button>
            <div class="nav-title">${title}</div>
        `;

        // If we already have a back container, replace it
        const existing = topBar.querySelector('.nav-back-container');
        if (existing) existing.remove();

        // Hide the standard greeting header if showing back button
        const header = topBar.querySelector('.top-bar-header');
        if (header) header.style.display = 'none';

        const titleEl = topBar.querySelector('.app-title');
        if (titleEl) titleEl.style.display = 'none';

        topBar.prepend(backContainer);

        document.getElementById('nav-back-button').addEventListener('click', (e) => {
            e.preventDefault();
            // Restore visibility
            if (header) header.style.display = 'flex';
            if (titleEl) titleEl.style.display = 'block';
            backContainer.remove();

            if (onBack) onBack();
            else window.navigateTo('home');
        });
    }
};

// Auto-initialize when loaded
document.addEventListener('DOMContentLoaded', () => {
    // We'll call this from app.js after rendering grids
});
