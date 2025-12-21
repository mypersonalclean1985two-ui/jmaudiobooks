document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const modal = document.getElementById('book-modal');
    const closeBtn = document.querySelector('.close-btn');

    let books = [];

    // Fetch books from JSON
    fetch('../data/books.json')
        .then(response => response.json())
        .then(data => {
            books = data;
            initApp();
        })
        .catch(error => console.error('Error loading books:', error));

    // View Rendering Logic
    const mainContent = document.querySelector('.main-content');

    function renderHome() {
        mainContent.innerHTML = `
            <div class="hero-section" id="hero-section"></div>
            <div class="section-header">
                <h2 class="section-title">Trending</h2>
                <a href="#" class="view-all">See All</a>
            </div>
            <div class="book-row" id="trending-row"></div>
            <div class="section-header">
                <h2 class="section-title">Explore</h2>
                <select id="category-filter" style="border:none; background:transparent; font-weight:600; color:#6366f1;">
                    <option value="all">All</option>
                </select>
            </div>
            <div class="book-list" id="all-books-grid"></div>
        `;

        // Re-bind elements
        const heroSection = document.getElementById('hero-section');
        const trendingRow = document.getElementById('trending-row');
        const allBooksGrid = document.getElementById('all-books-grid');
        const categoryFilter = document.getElementById('category-filter');

        // Populate Content
        if (books.length > 0) {
            renderHero(books[0], heroSection);
            renderBookRow(books.slice(0, 5), trendingRow);
            renderBookList(books, allBooksGrid);
            populateCategories(categoryFilter);

            // Re-attach filter listener (only for the dynamic category dropdown)
            categoryFilter.addEventListener('change', () => {
                const term = searchInput.value.toLowerCase();
                filterBooks(term, categoryFilter.value, allBooksGrid);
            });
        }
    }

    // Global Search Listener
    searchInput.addEventListener('input', () => {
        const term = searchInput.value.toLowerCase();
        const categoryFilter = document.getElementById('category-filter');
        const allBooksGrid = document.getElementById('all-books-grid');

        // Only filter if we are on the Home view (elements exist)
        if (categoryFilter && allBooksGrid) {
            filterBooks(term, categoryFilter.value, allBooksGrid);
        }
    });

    function renderDiscover() {
        mainContent.innerHTML = `
            <div class="discover-container">
                <!-- Banners -->
                <div class="banner-carousel">
                    <div class="banner-item" style="background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);">
                        <div class="banner-text">
                            <h3>Summer Sale</h3>
                            <p>Up to 50% off</p>
                        </div>
                    </div>
                    <div class="banner-item" style="background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);">
                        <div class="banner-text">
                            <h3>New Arrivals</h3>
                            <p>Check out the latest</p>
                        </div>
                    </div>
                    <div class="banner-item" style="background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);">
                        <div class="banner-text">
                            <h3>Editor's Choice</h3>
                            <p>Curated for you</p>
                        </div>
                    </div>
                </div>

                <!-- Category Pills -->
                <div class="category-pills">
                    <div class="pill active">All</div>
                    <div class="pill">Fiction</div>
                    <div class="pill">Sci-Fi</div>
                    <div class="pill">Mystery</div>
                    <div class="pill">Business</div>
                    <div class="pill">Tech</div>
                </div>

                <!-- Sections -->
                <div class="discover-section">
                    <div class="discover-section-header">
                        <h2 class="discover-section-title">Trending Now</h2>
                    </div>
                    <div class="book-row" id="discover-trending"></div>
                </div>

                <div class="discover-section">
                    <div class="discover-section-header">
                        <h2 class="discover-section-title">Top Rated</h2>
                    </div>
                    <div class="book-row" id="discover-top"></div>
                </div>

                <div class="discover-section">
                    <div class="discover-section-header">
                        <h2 class="discover-section-title">New Releases</h2>
                    </div>
                    <div class="book-list" id="discover-new"></div>
                </div>
            </div>
        `;

        // Populate Discover Content
        renderBookRow(books.slice(0, 6), document.getElementById('discover-trending'));
        renderBookRow(books.slice(6, 12), document.getElementById('discover-top'));
        renderBookList(books.slice(12, 18), document.getElementById('discover-new'));

        // Pill Logic
        const pills = document.querySelectorAll('.pill');
        pills.forEach(pill => {
            pill.addEventListener('click', () => {
                pills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
            });
        });
    }

    function renderLibrary() {
        mainContent.innerHTML = `
            <div class="section-header">
                <h2 class="section-title">My Library</h2>
            </div>
            <div class="book-list" id="library-grid">
                <!-- Placeholder for saved books -->
                <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                    <p style="font-size: 3rem; margin-bottom: 10px;">📚</p>
                    <p>Your library is empty.</p>
                    <p style="font-size: 0.8rem;">Books you download or mark as favorite will appear here.</p>
                </div>
            </div>
        `;
    }

    function renderProfile() {
        mainContent.innerHTML = `
            <div style="padding: 20px; display: flex; flex-direction: column; align-items: center;">
                <div style="width: 100px; height: 100px; background-color: #e0e7ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 3rem; margin-bottom: 16px; color: #6366f1;">
                    👤
                </div>
                <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 4px;">Guest User</h2>
                <p style="color: var(--text-muted); margin-bottom: 24px;">guest@example.com</p>
                
                <div style="width: 100%; display: flex; flex-direction: column; gap: 12px;">
                    <button class="btn-primary" style="width: 100%;">Edit Profile</button>
                    <button class="btn-secondary" style="width: 100%; border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <span>⚙️</span> Settings
                    </button>
                    <button class="btn-secondary" style="width: 100%; border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; color: #ef4444;">
                        <span>🚪</span> Log Out
                    </button>
                </div>
        // Update Read button to open in-app reader
        const readBtn = document.getElementById('modal-read-btn');
        readBtn.onclick = (e) => {
            e.preventDefault();
            window.location.href = `reader.html ? file = ${ book.file }& title=${ encodeURIComponent(book.title) } `;
        };

        modal.style.display = 'flex';
    }

    window.openModalById = function (id) {
        const book = books.find(b => b.id === id);
        if (book) openModal(book);
    };

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Bottom Navigation
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const target = btn.getAttribute('data-target');
            if (target === 'home') {
                renderHome();
            } else if (target === 'discover') {
                renderDiscover();
            } else if (target === 'library') {
                renderLibrary();
            } else if (target === 'profile') {
                renderProfile();
            }
        });
    });
});
