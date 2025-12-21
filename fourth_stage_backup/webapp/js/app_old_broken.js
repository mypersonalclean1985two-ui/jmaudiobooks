document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:5000';
    const searchInput = document.getElementById('search-input');
    const modal = document.getElementById('book-modal');
    const closeBtn = document.querySelector('.close-btn');
    const mainContent = document.getElementById('main-content');

    // Profile Elements
    const profileModal = document.getElementById('profile-modal');
    const closeProfileBtn = document.getElementById('close-profile-modal');
    const profileNameInput = document.getElementById('profile-name-input');
    const profileEmailInput = document.getElementById('profile-email-input');
    const profileBioInput = document.getElementById('profile-bio-input');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const profileUpload = document.getElementById('profile-upload');
    const profilePreview = document.getElementById('edit-profile-preview');
    const profilePlaceholder = document.getElementById('edit-profile-placeholder');

    // Settings Elements
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-modal');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    // Theme Management
    function setTheme(isDark) {
        const root = document.documentElement;
        if (isDark) {
            root.style.setProperty('--bg-primary', '#0f1419');
            root.style.setProperty('--bg-secondary', '#1a1f2e');
            root.style.setProperty('--bg-card', '#1e2433');
            root.style.setProperty('--text-primary', '#fff');
            root.style.setProperty('--text-secondary', '#9ca3af');
            root.style.setProperty('--border-color', '#2d3748');
        } else {
            root.style.setProperty('--bg-primary', '#f3f4f6');
            root.style.setProperty('--bg-secondary', '#ffffff');
            root.style.setProperty('--bg-card', '#ffffff');
            root.style.setProperty('--text-primary', '#111827');
            root.style.setProperty('--text-secondary', '#4b5563');
            root.style.setProperty('--border-color', '#e5e7eb');
        }
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        if (darkModeToggle) darkModeToggle.checked = isDark;
    }

    // Initialize Theme
    const savedTheme = localStorage.getItem('theme');
    // Default to dark mode if no preference saved, or if saved preference is dark
    const isDark = savedTheme ? savedTheme === 'dark' : true;
    setTheme(isDark);

    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', (e) => {
            setTheme(e.target.checked);
        });
    }

    // Logout Elements
    const logoutModal = document.getElementById('logout-modal');
    const cancelLogoutBtn = document.getElementById('cancel-logout-btn');
    const confirmLogoutBtn = document.getElementById('confirm-logout-btn');

    // Login Elements (Created dynamically)
    let loginModal;

    let books = [];
    let currentlyReading = null;
    let readingProgress = {};
    let stats = { streak: 7, weekMinutes: 214, completedBooks: 32 };


    // User Profile State - reference global profile for subscription sync
    // Declare globalUserProfile first (moved to top of file)
    if (!window.globalUserProfile) {
        window.globalUserProfile = {
            name: 'Guest User',
            email: 'guest@example.com',
            bio: 'Avid reader and book collector.',
            image: null,
            isGuest: true,
            subscriptionStatus: null,
            subscriptionExpiry: null,
            subscriptionPlan: null
        };
    }
    let userProfile = window.globalUserProfile;


    // Auth State Listener
    window.onAuthStateChanged = async (user) => {
        if (user) {
            console.log('Auth state changed: Logged in as', user.email);
            userProfile.name = user.displayName || 'User';
            userProfile.email = user.email;
            userProfile.image = user.photoURL;
            userProfile.isGuest = false;

            // Fetch data from Firestore
            try {
                const remoteStats = await window.firebaseHelpers.getStats(user.uid);
                if (remoteStats && remoteStats.lastUpdated) {
                    stats = { ...stats, ...remoteStats };
                }

                const remoteProgress = await window.firebaseHelpers.getReadingProgress(user.uid);
                if (remoteProgress && Object.keys(remoteProgress).length > 0) {
                    readingProgress = remoteProgress;
                }

                // Save to local storage to keep them in sync
                localStorage.setItem('readingProgress', JSON.stringify(readingProgress));
                localStorage.setItem('stats', JSON.stringify(stats));

            } catch (e) {
                console.error("Error syncing data on login:", e);
            }
        } else {
            // Ensure guest mode if not logged in
            if (!userProfile.isGuest && !window.currentUser) {
                userProfile.isGuest = true;
            }
        }
        renderProfile();
        setGreeting();
        // Re-render home to update stats display
        if (document.querySelector('.nav-btn.active')?.getAttribute('data-target') === 'home') {
            renderHome();
        }
    };

    function createLoginModal() {
        const modalHtml = `
            <div id="login-modal" class="modal" style="display:none;">
                <div class="modal-content" style="max-width: 400px; height: auto; border-radius: 24px;">
                    <span class="close-btn" id="close-login-modal">&times;</span>
                    <h2 id="auth-title">Log In</h2>
                    <div style="display:flex;flex-direction:column;gap:15px;margin-top:20px;">
                        <div id="name-field" style="display:none;">
                            <label style="display:block;margin-bottom:5px;color:var(--text-secondary);">Name</label>
                            <input type="text" id="login-name" style="width:100%;padding:12px;border:1px solid var(--border-color);border-radius:12px;background:var(--bg-card);color:var(--text-primary);">
                        </div>
                        <div>
                            <label style="display:block;margin-bottom:5px;color:var(--text-secondary);">Email</label>
                            <input type="email" id="login-email" style="width:100%;padding:12px;border:1px solid var(--border-color);border-radius:12px;background:var(--bg-card);color:var(--text-primary);">
                        </div>
                        <div>
                            <label style="display:block;margin-bottom:5px;color:var(--text-secondary);">Password</label>
                            <input type="password" id="login-password" style="width:100%;padding:12px;border:1px solid var(--border-color);border-radius:12px;background:var(--bg-card);color:var(--text-primary);">
                        </div>
                        <button id="perform-auth-btn" class="btn-primary" style="width:100%;">Log In</button>
                        <div id="auth-error" style="color:#ef4444;display:none;font-size:0.9rem;"></div>
                        <div style="text-align:center;margin-top:10px;">
                            <span id="auth-switch-text" style="color:var(--text-secondary);">Don't have an account? </span>
                            <a href="#" id="auth-switch-link" style="color:var(--accent-primary);text-decoration:none;font-weight:600;">Sign Up (Get 3 Days Free!)</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        loginModal = document.getElementById('login-modal');

        const title = document.getElementById('auth-title');
        const nameField = document.getElementById('name-field');
        const btn = document.getElementById('perform-auth-btn');
        const switchText = document.getElementById('auth-switch-text');
        const switchLink = document.getElementById('auth-switch-link');
        const errorDiv = document.getElementById('auth-error');
        let isLogin = true;

        document.getElementById('close-login-modal').onclick = () => loginModal.style.display = 'none';

        switchLink.onclick = (e) => {
            e.preventDefault();
            isLogin = !isLogin;
            title.textContent = isLogin ? 'Log In' : 'Sign Up';
            nameField.style.display = isLogin ? 'none' : 'block';
            btn.textContent = isLogin ? 'Log In' : 'Sign Up';
            switchText.textContent = isLogin ? "Don't have an account? " : "Already have an account? ";
            switchLink.textContent = isLogin ? 'Sign Up (Get 3 Days Free!)' : 'Log In';
            errorDiv.style.display = 'none';
        };

        btn.onclick = async () => {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const name = document.getElementById('login-name').value;

            try {
                if (isLogin) {
                    await window.firebaseHelpers.signInWithEmail(email, password);
                } else {
                    if (!name) throw new Error("Name is required");
                    await window.firebaseHelpers.signUpWithEmail(email, password, name);
                }
                loginModal.style.display = 'none';
                errorDiv.style.display = 'none';
            } catch (err) {
                console.error(err);
                errorDiv.textContent = err.message;
                errorDiv.style.display = 'block';
            }
        };

        loginModal.onclick = (e) => {
            if (e.target === loginModal) loginModal.style.display = 'none';
        };
    }
    createLoginModal();

    function loadProgress() {
        const saved = localStorage.getItem('readingProgress');
        if (saved) readingProgress = JSON.parse(saved);
        const savedReading = localStorage.getItem('currentlyReading');
        if (savedReading) currentlyReading = JSON.parse(savedReading);
        const savedStats = localStorage.getItem('stats');
        if (savedStats) stats = JSON.parse(savedStats);

        // Load Profile
        const savedProfile = localStorage.getItem('userProfile');
        if (savedProfile) {
            userProfile = JSON.parse(savedProfile);
        }
    }

    function saveProgress() {
        localStorage.setItem('readingProgress', JSON.stringify(readingProgress));
        localStorage.setItem('currentlyReading', JSON.stringify(currentlyReading));
        localStorage.setItem('stats', JSON.stringify(stats));

        if (window.currentUser && !userProfile.isGuest) {
            if (currentlyReading) {
                window.firebaseHelpers.updateReadingProgress(window.currentUser.uid, currentlyReading.bookId, currentlyReading);
            }
            window.firebaseHelpers.updateStats(window.currentUser.uid, stats);
        }
    }

    function saveProfile() {
        localStorage.setItem('userProfile', JSON.stringify(userProfile));

        if (window.currentUser && !userProfile.isGuest) {
            window.firebaseHelpers.updateUserProfile(window.currentUser.uid, userProfile);
        }

        renderProfile(); // Re-render to show changes
        setGreeting(); // Update greeting
    }

    function setGreeting() {
        const hour = new Date().getHours();
        let greeting = 'Good evening';
        if (hour < 12) greeting = 'Good morning';
        else if (hour < 18) greeting = 'Good afternoon';

        // Personalize greeting if not guest
        if (!userProfile.isGuest) {
            const firstName = userProfile.name.split(' ')[0];
            const greetingEl = document.getElementById('greeting');
            if (greetingEl) greetingEl.textContent = `${greeting}, ${firstName}`;
        } else {
            const greetingEl = document.getElementById('greeting');
            if (greetingEl) greetingEl.textContent = greeting;
        }
    }
    // Fetch books from Firebase
    window.firebaseHelpers.getBooks()
        .then(data => {
            console.log(`[DEBUG] Fetched ${data.length} books from Firestore.`);
            books = data;
            // Inject Test Audiobook
            books.unshift({
                id: 'test-audiobook-1',
                title: 'Test Audiobook (Complex)',
                author: 'Demo Author',
                narrator: 'AI Narrator',
                coverUrl: 'https://placehold.co/300x300/667eea/ffffff?text=Audiobook+Test',
                fileUrl: 'audio/sample.mp3',
                description: 'A sample audiobook with multiple chapters to test the player functionality.',
                genre: 'Test',
                rating: 5.0,
                duration: '1h 0m'
            });

            // Inject Real Audiobook (Sherlock Holmes)
            books.unshift({
                id: 'sherlock-holmes-1',
                title: 'The Adventures of Sherlock Holmes',
                author: 'Arthur Conan Doyle',
                narrator: 'LibriVox',
                coverUrl: 'https://placehold.co/300x400/222/fff?text=Sherlock+Holmes',
                fileUrl: 'audio/sherlock.mp3',
                description: 'A Scandal in Bohemia - The first short story in the Sherlock Holmes series. (Audio: Sample for testing)',
                genre: 'Mystery',
                rating: 4.9,
                duration: '45m 12s'
            });
            loadProgress();
            setGreeting();
                <p>Could not connect to Firebase.</p>
                <p>Code: ${error.code || 'N/A'}</p>
                <p>Message: ${error.message || 'N/A'}</p>
                <pre style="text-align:left;background:#f0f0f0;padding:10px;margin-top:20px;overflow:auto;">${JSON.stringify(error, null, 2)}</pre>
            </div > `;
        });

    // openReader function moved outside DOMContentLoaded to include subscription checking

    function getCoverUrl(book) {
        return book.coverUrl || 'placeholder.svg';
    }

    function renderHome() {
        const currentBook = books.find(b => b.id === currentlyReading?.bookId);
        mainContent.innerHTML = `< div class="section-title" > CONTINUE READING</div ><div class="continue-reading-card" onclick="resumeReading()"><img src="${currentBook ? getCoverUrl(currentBook) : 'placeholder.svg'}" class="continue-reading-cover" alt="${currentBook?.title || 'Book'}" onerror="this.src='placeholder.svg'"><div class="continue-reading-info"><div><div class="continue-reading-title" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${currentBook?.title || 'No Book'}</div><div class="continue-reading-author">${currentBook?.author || ''}</div></div><div><div class="progress-bar"><div class="progress-fill" style="width:${currentlyReading?.progress || 0}%"></div></div><div class="progress-text">Chapter ${currentlyReading?.chapter || 0} of ${currentlyReading?.totalChapters || 0} - ${currentlyReading?.progress || 0}% completed</div><button class="resume-btn" onclick="event.stopPropagation();resumeReading();">Resume</button></div></div></div><div class="stats-grid"><div class="stat-card"><div class="stat-icon">🔥</div><div class="stat-label">Streak</div><div class="stat-value">${stats.streak} days</div></div><div class="stat-card"><div class="stat-icon">🕐</div><div class="stat-label">This week</div><div class="stat-value">${stats.weekMinutes} min</div></div><div class="stat-card"><div class="stat-icon">✓</div><div class="stat-label">Completed</div><div class="stat-value">${stats.completedBooks} books</div></div></div><div class="tabs-container"><div class="tab active" data-category="all">Top Picks For You</div><div class="tab" data-category="Fiction">New Releases</div><div class="tab" data-category="Sci-Fi">Fiction</div><div class="tab" data-category="Mystery">Mystery</div></div><div class="books-grid" id="books-grid" style="display: flex; overflow-x: auto; gap: 16px; padding-bottom: 16px; margin-bottom: 32px;"></div><div class="section-header"><div class="section-header-title">Recommended</div><div class="see-all">See all ›</div></div><div class="books-grid grid-layout" id="recommended-grid" style="display: flex; overflow-x: auto; gap: 16px; padding-bottom: 16px; margin-bottom: 32px;"></div>`;
        renderBooksGrid(books.slice(0, 9), document.getElementById('books-grid'));
        renderBooksGrid(books.slice(9, 15), document.getElementById('recommended-grid'));

        setupTabs();
        setupSeeAll();
    }

    function setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const category = tab.getAttribute('data-category');
                const filtered = category === 'all' ? books : books.filter(b => b.category === category);
                const gridId = tab.parentElement.nextElementSibling.id; // Assumes grid follows container
                if (document.getElementById(gridId)) {
                    renderBooksGrid(filtered.slice(0, 9), document.getElementById(gridId));
                }
            });
        });
    }

    function setupSeeAll() {
        const seeAllBtn = document.querySelector('.see-all');
        if (seeAllBtn) {
            seeAllBtn.addEventListener('click', () => {
                const navBtns = document.querySelectorAll('.nav-btn');
                navBtns.forEach(b => b.classList.remove('active'));
                const discoverBtn = document.querySelector('.nav-btn[data-target="discover"]');
                if (discoverBtn) discoverBtn.classList.add('active');
                renderDiscover();
            });
        }
    }

    function renderBooksGrid(booksToRender, container) {
        container.innerHTML = '';
        booksToRender.forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.style.cssText = "flex: 0 0 100px; width: 100px; display: flex; flex-direction: column; cursor: pointer;";
            card.innerHTML = `< img src = "${getCoverUrl(book)}" class="book-cover" alt = "${book.title}" onerror = "this.src='placeholder.svg'" style = "width: 100%; aspect-ratio: 2/3; border-radius: 12px; object-fit: cover; margin-bottom: 8px;" ><div class="book-title" style="font-size: 0.9rem; font-weight: 600; color: #fff; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.4em; line-height: 1.2;">${book.title}</div><div class="book-author" style="font-size: 0.75rem; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${book.author}</div>`;
            container.appendChild(card);
        });
    }

    function renderDiscover() {
        mainContent.innerHTML = `< div class="section-header" > <div class="section-header-title">Discover</div></div ><div class="tabs-container"><div class="tab active" data-category="all">All</div><div class="tab" data-category="Fiction">Fiction</div><div class="tab" data-category="Sci-Fi">Sci-Fi</div><div class="tab" data-category="Mystery">Mystery</div><div class="tab" data-category="Business">Business</div><div class="tab" data-category="Romance">Romance</div></div><div class="books-grid grid-layout" id="discover-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;"></div>`;
        renderBooksGrid(books, document.getElementById('discover-grid'));

        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const category = tab.getAttribute('data-category');
                const filtered = category === 'all' ? books : books.filter(b => b.category === category);
                renderBooksGrid(filtered, document.getElementById('discover-grid'));
            });
        });
    }

    function renderLibrary() {
        mainContent.innerHTML = `< div class="section-header" > <div class="section-header-title">My Library</div></div > <div style="text-align:center;padding:60px 20px;color:var(--text-secondary);"><p style="font-size:4rem;margin-bottom:16px;">📚</p><p style="font-size:1.1rem;color:var(--text-primary);margin-bottom:8px;">Your library is empty</p><p style="font-size:0.9rem;">Books you save will appear here</p></div>`;
    }

    function renderProfile() {
        const avatarHtml = userProfile.image
            ? `< img src = "${userProfile.image}" class="profile-avatar" > `
            : `< div class="profile-placeholder" > ${ userProfile.name.charAt(0).toUpperCase() }</div > `;

        const loginBtnHtml = userProfile.isGuest
            ? `< button class="btn-primary" style = "width:100%;margin-bottom:12px;" id = "login-btn" > Log In</button > `
            : `< button class="btn-secondary" style = "width:100%;color:#ef4444;" id = "logout-btn" > <span>🚪</span> Log Out</button > `;

        const editBtnHtml = !userProfile.isGuest
            ? `< button class="btn-primary" style = "width:100%;" id = "edit-profile-btn" > Edit Profile</button > `
            : '';

        // Subscription Status
        let subscriptionHtml = '';
        if (!userProfile.isGuest) {
            const isActive = userProfile.subscriptionStatus === 'active' && userProfile.subscriptionExpiry && new Date(userProfile.subscriptionExpiry) > new Date();
            if (isActive) {
                const expiryDate = new Date(userProfile.subscriptionExpiry).toLocaleDateString();
                const planName = userProfile.subscriptionPlan || 'Premium';
                const isTrial = planName === 'trial';
                const badgeColor = isTrial ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                const badgeText = isTrial ? '🎁 Free Trial' : `✨ ${ planName.charAt(0).toUpperCase() + planName.slice(1) } Member`;

                subscriptionHtml = `
                < div style = "background: ${badgeColor}; border-radius: 16px; padding: 16px; margin-bottom: 16px; text-align: center;" >
                        <div style="color: white; font-weight: 600; font-size: 1.1rem; margin-bottom: 4px;">${badgeText}</div>
                        <div style="color: rgba(255,255,255,0.9); font-size: 0.85rem;">${isTrial ? 'Trial ends' : 'Active until'} ${expiryDate}</div>
                    </div >
                `;
            } else {
                subscriptionHtml = `
                < div style = "background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 16px; padding: 16px; margin-bottom: 16px; text-align: center;" >
                        <div style="color: #ef4444; font-weight: 600; margin-bottom: 8px;">🔒 No Active Subscription</div>
                        <button class="btn-primary" style="width:100%;" onclick="window.showModal('subscription-modal')">Subscribe Now</button>
                    </div >
                `;
            }
        }

        mainContent.innerHTML = `
                < div class="profile-header" >
                <div class="profile-avatar-container">
                    ${avatarHtml}
                </div>
                <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:4px;color:var(--text-primary);">${userProfile.name}</h2>
                <p style="color:var(--text-secondary);margin-bottom:16px;">${userProfile.email}</p>
                <div class="profile-bio">${userProfile.bio || 'No bio yet.'}</div>
                
                ${ subscriptionHtml }
                
                <div class="profile-stats">
                    <div class="profile-stat-item">
                        <div class="profile-stat-value">${stats.completedBooks}</div>
                        <div class="profile-stat-label">Books</div>
                    </div>
                    <div class="profile-stat-item">
                        <div class="profile-stat-value">${stats.streak}</div>
                        <div class="profile-stat-label">Streak</div>
                    </div>
                    <div class="profile-stat-item">
                        <div class="profile-stat-value">${stats.weekMinutes}</div>
                        <div class="profile-stat-label">Minutes</div>
                    </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:12px;max-width:300px;margin:0 auto;">
                    ${loginBtnHtml}
                    ${editBtnHtml}
                    <button class="btn-secondary" style="width:100%;" id="settings-btn"><span>⚙️</span> Settings</button>
                </div>
            </div >
                `;

        // Attach Event Listeners
        const editBtn = document.getElementById('edit-profile-btn');
        const settingsBtn = document.getElementById('settings-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const loginBtn = document.getElementById('login-btn');

        if (editBtn) editBtn.addEventListener('click', openProfileModal);
        if (settingsBtn) settingsBtn.addEventListener('click', openSettingsModal);
        if (logoutBtn) logoutBtn.addEventListener('click', openLogoutModal);
        if (loginBtn) loginBtn.addEventListener('click', () => loginModal.style.display = 'flex');
    }



    // Profile Functions
    window.openProfileModal = function () {
        profileNameInput.value = userProfile.name;
        profileEmailInput.value = userProfile.email;
        profileBioInput.value = userProfile.bio || '';

        if (userProfile.image) {
            profilePreview.src = userProfile.image;
            profilePreview.style.display = 'block';
            profilePlaceholder.style.display = 'none';
        } else {
            profilePreview.style.display = 'none';
            profilePlaceholder.style.display = 'flex';
            profilePlaceholder.textContent = userProfile.name.charAt(0).toUpperCase();
        }

        profileModal.style.display = 'flex';
    };

    window.openSettingsModal = function () {
        settingsModal.style.display = 'flex';
    };

    window.openLogoutModal = function () {
        logoutModal.style.display = 'flex';
    };

    window.logout = function () {
        window.firebaseHelpers.signOut().then(() => {
            userProfile = {
                name: 'Guest User',
                email: 'guest@example.com',
                bio: 'Avid reader and book collector.',
                image: null,
                isGuest: true
            };
            saveProfile();
            logoutModal.style.display = 'none';
        });
    };

    // Image Upload Handler
    if (profileUpload) {
        profileUpload.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    profilePreview.src = e.target.result;
                    profilePreview.style.display = 'block';
                    profilePlaceholder.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', () => {
            profileModal.style.display = 'none';
        });
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
    }

    if (cancelLogoutBtn) {
        cancelLogoutBtn.addEventListener('click', () => {
            logoutModal.style.display = 'none';
        });
    }

    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', () => {
            logout();
        });
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', () => {
            const newName = profileNameInput.value.trim();
            const newEmail = profileEmailInput.value.trim();
            const newBio = profileBioInput.value.trim();

            if (newName && newEmail) {
                userProfile.name = newName;
                userProfile.email = newEmail;
                userProfile.bio = newBio;
                // userProfile.isGuest = false; // Don't auto-set to false on edit, only on login

                // Save image if uploaded
                if (profilePreview.style.display === 'block') {
                    userProfile.image = profilePreview.src;
                }

                saveProfile();
                profileModal.style.display = 'none';
            } else {
                alert('Please enter both name and email.');
            }
        });
    }

    function resumeReading() {
        const book = books.find(b => b.id === currentlyReading?.bookId);
        if (book) {
            openReader(book);
        }
    }
    window.resumeReading = resumeReading;

    function openModal(book) {
        const coverPath = getCoverUrl(book);
        document.getElementById('modal-cover-img').src = coverPath;
        document.getElementById('modal-title').textContent = book.title;
        document.getElementById('modal-author').textContent = book.author;
        const price = book.price || 0;
        document.getElementById('modal-price').textContent = `$${ price.toFixed(2) } `;
        document.getElementById('modal-description').innerHTML = book.description || "No description available.";
        const readBtn = document.getElementById('modal-read-btn');
        readBtn.onclick = (e) => {
            e.preventDefault();
            currentlyReading = { bookId: book.id, progress: 0, chapter: 1, totalChapters: 20 };
            saveProgress();
            openReader(book);
        };
        modal.style.display = 'flex';
    }

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Profile Modal Outside Click
    if (profileModal) {
        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) {
                profileModal.style.display = 'none';
            }
        });
    }

    // Settings Modal Outside Click
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
    }

    // Logout Modal Outside Click
    if (logoutModal) {
        logoutModal.addEventListener('click', (e) => {
            if (e.target === logoutModal) {
                logoutModal.style.display = 'none';
            }
        });
    }

    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.getAttribute('data-target');
            navigateTo(target);
        });
    });

    function navigateTo(target) {
        if (target === 'home') renderHome();
        else if (target === 'discover') renderDiscover();
        else if (target === 'library') renderLibrary();
        else if (target === 'profile') renderProfile();
    }
    window.navigateTo = navigateTo;

    searchInput.addEventListener('input', () => {
        const term = searchInput.value.toLowerCase();
        const grids = document.querySelectorAll('.books-grid');
        if (term.length > 0 && grids.length > 0) {
            const filtered = books.filter(book => book.title.toLowerCase().includes(term) || book.author.toLowerCase().includes(term) || book.category.toLowerCase().includes(term));
            grids.forEach(grid => renderBooksGrid(filtered, grid));
        } else if (term.length === 0) {
            const currentView = document.querySelector('.nav-btn.active')?.getAttribute('data-target');
            if (currentView === 'home') renderHome();
            else if (currentView === 'discover') renderDiscover();
        }
    });

    window.showModal = function (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
        }
    };

    window.closeModal = function (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    };
});

// Make saveProfile accessible globally
window.saveProfile = function () {
    localStorage.setItem('userProfile', JSON.stringify(window.globalUserProfile));

    if (window.currentUser && !window.globalUserProfile.isGuest) {
        window.firebaseHelpers.updateUserProfile(window.currentUser.uid, window.globalUserProfile);
    }
};


async function openPlayer(book) {
    if (!book) return;

    // Check if user is logged in
    if (!window.currentUser) {
        alert("Please log in to listen to audiobooks.");
        window.showModal('login-modal');
        return;
    }

    // Check subscription
    const hasSubscription = await checkSubscription();
    if (!hasSubscription) {
        window.showModal('subscription-modal');
        return;
    }

    try {
        // FIX: Check if file is PDF or missing, and use sample audio for testing
        let fileUrl = book.fileUrl; // Extract from book object

        if (!fileUrl || fileUrl.endsWith('.pdf')) {
            console.warn("PDF or missing file detected. Using sample audio for demonstration.");
            fileUrl = 'audio/sample.mp3';
        } else if (fileUrl && !fileUrl.startsWith('http') && !fileUrl.startsWith('audio/')) {
            // Try to get download URL if it's a storage path
            try {
                fileUrl = await window.firebaseStorage.ref(fileUrl).getDownloadURL();
            } catch (e) {
                console.warn("Could not fetch storage URL, using sample.", e);
                fileUrl = 'audio/sample.mp3';
            }
        }
        // Pass book data to player
        const params = new URLSearchParams({
            file: fileUrl,
            title: book.title,
            id: book.id,
            author: book.author || '',
            narrator: book.narrator || 'Unknown Narrator',
            cover: book.coverUrl || ''
        });
        window.location.href = `player.html ? ${ params.toString() } `;
    } catch (error) {
        console.error("Error getting file URL:", error);
        alert("Could not open audiobook. Please try again.");
    }
}

// Keep old name for compatibility
const openReader = openPlayer;


async function checkSubscription() {
    if (!window.currentUser) return false;

    // Check local profile first for speed
    if (window.globalUserProfile.subscriptionStatus === 'active' && window.globalUserProfile.subscriptionExpiry && new Date(window.globalUserProfile.subscriptionExpiry) > new Date()) {
        return true;
    }

    // Double check with server
    try {
        const subData = await window.firebaseHelpers.getUserSubscription(window.currentUser.uid);
        if (subData && subData.status === 'active' && subData.expiry && new Date(subData.expiry.toDate()) > new Date()) {
            // Update local profile
            window.globalUserProfile.subscriptionStatus = 'active';
            window.globalUserProfile.subscriptionExpiry = subData.expiry.toDate().toISOString();
            window.saveProfile();
            return true;
        }

        // Check if user is eligible for free trial (never had a subscription)
        // NOTE: Trial is now granted ONLY on signup. This check is just for legacy/fallback or if we want to re-enable auto-grant later.
        // For now, if no active subscription, return false.
        return false;
    } catch (e) {
        console.error("Error checking subscription:", e);
    }
    return false;
}

async function purchaseSubscription(plan, price) {
    if (!window.currentUser) {
        alert("Please log in to subscribe.");
        window.closeModal('subscription-modal');
        window.showModal('login-modal');
        return;
    }

    let confirmMessage = `Confirm purchase of ${ plan } plan for $${ price } ? `;
    if (plan === 'trial') {
        confirmMessage = "Start your 3-day free trial?";
    }

    const confirmPurchase = confirm(confirmMessage);
    if (!confirmPurchase) return;

    // Mock Payment Process
    try {
        const now = new Date();
        let expiry = new Date();

        if (plan === 'monthly') expiry.setMonth(now.getMonth() + 1);
        else if (plan === 'quarterly') expiry.setMonth(now.getMonth() + 3);
        else if (plan === 'yearly') expiry.setFullYear(now.getFullYear() + 1);
        else if (plan === 'trial') expiry.setDate(now.getDate() + 3);

        await window.firebaseHelpers.updateUserSubscription(window.currentUser.uid, {
            status: 'active',
            plan: plan,
            expiry: expiry,
            purchasedAt: new Date()
        });

        // Update local state
        window.globalUserProfile.subscriptionStatus = 'active';
        window.globalUserProfile.subscriptionExpiry = expiry.toISOString();
        window.globalUserProfile.subscriptionPlan = plan;
        window.saveProfile();

        window.closeModal('subscription-modal');
        if (plan === 'trial') {
            alert("Free trial started! Enjoy 3 days of unlimited access.");
        } else {
            alert("Subscription successful! You can now read unlimited books.");
        }

    } catch (error) {
        console.error("Subscription failed:", error);
        alert("Purchase failed. Please try again.");
    }
}

// Make functions globally accessible
window.openReader = openReader;
window.checkSubscription = checkSubscription;
window.purchaseSubscription = purchaseSubscription;
