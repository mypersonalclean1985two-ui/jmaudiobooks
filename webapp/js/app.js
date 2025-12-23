function initApp() {
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
    const notificationsToggle = document.getElementById('notifications-toggle'); // Added ID in HTML

    // Global User Profile
    if (!window.globalUserProfile) {
        window.globalUserProfile = {
            name: 'Guest User',
            email: 'guest@example.com',
            bio: 'Avid reader and book collector.',
            image: null,
            isGuest: true
        };
    }
    let userProfile = window.globalUserProfile;

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

        if (darkModeToggle) darkModeToggle.checked = isDark;

        // Persist to Cloud if logged in
        if (window.currentUser && !userProfile.isGuest) {
            window.firebaseHelpers.updateUserSettings(window.currentUser.uid, { darkMode: isDark });
        }
    }

    // Notification Management
    function setNotifications(enabled) {
        if (notificationsToggle) notificationsToggle.checked = enabled;

        // Persist to Cloud if logged in
        if (window.currentUser && !userProfile.isGuest) {
            window.firebaseHelpers.updateUserSettings(window.currentUser.uid, { notifications: enabled });
        }
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', (e) => {
            setTheme(e.target.checked);
        });
    }

    if (notificationsToggle) {
        notificationsToggle.addEventListener('change', (e) => {
            setNotifications(e.target.checked);
        });
    }

    // Initialize Default Theme (can be overridden by cloud settings later)
    setTheme(true);

    // Logout Elements
    const logoutModal = document.getElementById('logout-modal');
    const cancelLogoutBtn = document.getElementById('cancel-logout-btn');
    const confirmLogoutBtn = document.getElementById('confirm-logout-btn');

    // Login Elements (Created dynamically)
    let loginModal;

    let books = [];
    let currentlyReading = null;
    let readingProgress = {};
    let stats = { streak: 0, weekMinutes: 0, completedBooks: 0 };

    // Trial & Subscription Helper
    window.isTrialActive = () => {
        if (!window.currentUser || userProfile.isGuest) return false;
        if (!userProfile.trialStartDate) return true; // Failsafe for older accounts

        const start = userProfile.trialStartDate.toDate ? userProfile.trialStartDate.toDate() : new Date(userProfile.trialStartDate);
        const now = new Date();
        const diffDays = Math.ceil((now - start) / (1000 * 60 * 60 * 24));

        return diffDays <= 14; // 14-day rule
    };

    // Auth State Listener
    console.log("App: Registering onAuthStateChanged...");
    // Auth State Listener
    console.log("App: Registering onAuthStateChanged...");
    window.onAuthStateChanged = async (user) => {
        console.log("App: onAuthStateChanged fired. User:", user ? user.email : 'None');

        // Close Login Modal if open (failsafe)
        if (window.loginModal) window.loginModal.style.display = 'none';

        if (user) {
            window.currentUser = user;
            console.log('Auth state changed: Logged in as', user.email);

            // Capture Guest Data before overwriting
            const previousGuestName = userProfile.isGuest && userProfile.name !== 'Guest User' ? userProfile.name : null;
            const previousGuestBio = userProfile.isGuest && userProfile.bio !== 'Avid reader and book collector.' ? userProfile.bio : null;

            // Set initial values from Auth (Source of Truth for new logins)
            // Default to 'Guest' only if absolutely no name is found
            userProfile.name = user.displayName;
            userProfile.email = user.email;
            userProfile.image = user.photoURL;
            userProfile.isGuest = false;

            console.log("App: Auth Initialized. Name:", userProfile.name, "Email:", userProfile.email);

            // Fetch and prioritize Firestore data
            try {
                // Fetch the actual profile from Firestore
                const firestoreProfile = await window.firebaseHelpers.getUserProfile(user.uid);

                if (firestoreProfile) {
                    console.log("App: Found Firestore profile:", firestoreProfile);
                    // Only overwrite if Firestore has valid data (not empty strings)
                    if (firestoreProfile.displayName && firestoreProfile.displayName.trim() !== '') {
                        userProfile.name = firestoreProfile.displayName;
                    }
                    if (firestoreProfile.photoURL) {
                        userProfile.image = firestoreProfile.photoURL;
                    }
                    if (firestoreProfile.bio) {
                        userProfile.bio = firestoreProfile.bio;
                    }
                    if (firestoreProfile.trialStartDate) {
                        userProfile.trialStartDate = firestoreProfile.trialStartDate;
                    }
                } else {
                    // No Firestore profile? Check if we should migrate Guest Data
                    console.log("App: No Firestore profile found. Checking for guest migration...");
                    let updates = {};

                    // If we migrated from Guest with a custom name, use that. 
                    // OTHERWISE, keep the Google Name (don't overwrite with 'User')
                    if (previousGuestName) {
                        userProfile.name = previousGuestName;
                        updates.displayName = previousGuestName;
                    } else if (!userProfile.name) {
                        // If Auth didn't have a name either, fallback
                        userProfile.name = 'Book Lover';
                        updates.displayName = 'Book Lover';
                    } else {
                        // Use the Auth name (Google Name) for the initial Firestore save
                        updates.displayName = userProfile.name;
                    }

                    if (previousGuestBio) {
                        userProfile.bio = previousGuestBio;
                        updates.bio = previousGuestBio;
                    }
                    if (userProfile.image) {
                        updates.photoURL = userProfile.image;
                    }

                    // Save this initial state to Firestore so it persists
                    await window.firebaseHelpers.updateUserProfile(user.uid, {
                        ...updates,
                        email: userProfile.email
                    });
                }

                const remoteStats = await window.firebaseHelpers.getStats(user.uid);
                if (remoteStats && remoteStats.lastUpdated) {
                    stats = { ...stats, ...remoteStats };
                }

                const remoteProgress = await window.firebaseHelpers.getReadingProgress(user.uid);
                if (remoteProgress && Object.keys(remoteProgress).length > 0) {
                    readingProgress = remoteProgress;
                }

                // Fetch Settings
                const settings = await window.firebaseHelpers.getUserSettings(user.uid);
                if (settings) {
                    if (typeof settings.darkMode !== 'undefined') setTheme(settings.darkMode);
                    if (typeof settings.notifications !== 'undefined') setNotifications(settings.notifications);
                }

                window.globalUserProfile = userProfile;

                // Save critical data to local storage for offline resume, but relying on cloud for truth
                localStorage.setItem('readingProgress', JSON.stringify(readingProgress));
                localStorage.setItem('stats', JSON.stringify(stats));
                localStorage.setItem('userProfile', JSON.stringify(userProfile));

                // Alert Success (Optional, but helps debug)
                // alert("Logged in as: " + userProfile.name);

            } catch (e) {
                console.error("Error syncing data on login:", e);
                alert("Login Sync Error: " + e.message); // Help user report issues
            }
        } else {
            // Ensure guest mode if not logged in
            window.currentUser = null;
            userProfile = {
                name: 'Guest User',
                email: 'guest@example.com',
                bio: 'Avid reader and book collector.',
                image: null,
                isGuest: true
            };
            window.globalUserProfile = userProfile;

            // Reset Settings to Defaults
            setTheme(true);
            if (notificationsToggle) notificationsToggle.checked = true;
        }

        // Force UI Refresh
        renderProfile();
        setGreeting();

        // Update header if on Home
        if (document.querySelector('.nav-btn.active')?.getAttribute('data-target') === 'home') {
            renderHome();
        }
    };

    // Enhanced createLoginModal function with all improvements
    function createEnhancedLoginModal() {
        const modalHtml = `
        <div id="login-modal" class="modal" style="display:none;">
            <div class="modal-content">
                 <span class="close-btn" id="close-login-modal">&times;</span>
                <h2 id="auth-title">Log In</h2>
                
                <!-- Trial Messaging -->
                <div id="trial-info" style="background:rgba(245,158,11,0.1);border:1px dashed var(--accent-primary);border-radius:12px;padding:16px;text-align:center;margin-bottom:12px;">
                    <p style="color:var(--accent-primary);font-weight:800;font-size:1.1rem;margin-bottom:4px;">🎁 START 14-DAY FREE TRIAL</p>
                    <p style="color:rgba(255,255,255,0.7);font-size:0.85rem;">Unlimited access to all audiobooks</p>
                </div>

                <div style="display:flex;flex-direction:column;gap:16px;">
                    <!-- Name Field (only for signup) -->
                    <div id="name-field" style="display:none;">
                        <label style="display:block;margin-bottom:8px;color:rgba(255,255,255,0.6);font-size:0.9rem;">Name</label>
                        <input type="text" id="login-name" class="auth-input" placeholder="Your Name">
                    </div>
                    
                    <!-- Email Field -->
                    <div>
                        <label style="display:block;margin-bottom:8px;color:rgba(255,255,255,0.6);font-size:0.9rem;">Email Address</label>
                        <input type="email" id="login-email" class="auth-input" placeholder="you@example.com">
                    </div>
                    
                    <!-- Password Field with Toggle -->
                    <div>
                        <p id="splash-status"
                        style="color:rgba(255,255,255,0.7);font-size:0.85rem;font-weight:600;text-transform:uppercase;letter-spacing:1px;animation: statusFade 1.5s infinite;">
                        Initializing...</p>
                        <div class="password-field-wrapper">
                            <input type="password" id="login-password" class="auth-input" placeholder="••••••••">
                            <button type="button" class="password-toggle-btn" id="toggle-password">👁️</button>
                        </div>
                        <!-- Password Strength Indicator (only for signup) -->
                        <div id="password-strength" class="password-strength-container" style="display:none;">
                            <div class="password-strength-bar">
                                <div class="password-strength-fill" id="strength-fill"></div>
                            </div>
                            <div class="password-strength-text" id="strength-text"></div>
                        </div>
                    </div>

                    <!-- Forgot Password Link (only for login) -->
                    <div id="forgot-password-container" style="text-align:right;">
                        <a href="#" class="forgot-password-link" id="forgot-password-link">Forgot Password?</a>
                    </div>
                    
                    <!-- Submit Button -->
                    <button id="perform-auth-btn" class="btn-primary">Log In</button>
                    
                    <!-- Error Message -->
                    <div id="auth-error" style="color:#ef4444;display:none;font-size:0.9rem;padding:12px;background:rgba(239,68,68,0.1);border-radius:12px; text-align:center;"></div>
                    
                    <!-- Success Message -->
                    <div id="auth-success" style="display:none;" class="auth-success-message"></div>
                    
                    <!-- Divider -->
                    <div class="auth-divider">SECURE SOCIAL LOGIN</div>
                    
                    <!-- Google Sign-In Button -->
                    <button id="google-signin-btn" class="google-signin-btn">
                        <svg class="google-icon" viewBox="0 0 24 24" width="24" height="24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-. 34-1.43-. 34-2.25 0-.83.11-1.59.34-2.25V8.6H2.18C1.43 10.09 1 11.83 1 13.66s.43 3.57 1.18 5.09l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span>Continue with Google</span>
                    </button>

                    <!-- Apple Sign-In Button -->
                    <button id="apple-signin-btn" class="apple-signin-btn">
                        <svg class="apple-icon" viewBox="0 0 24 24" width="24" height="24">
                            <path d="M15.073 13.25c.01 2.376 2.083 3.167 2.106 3.178-.018.06-0.327 1.12-1.077 2.217-.65 0.957-1.326 1.91-2.39 1.928-1.045.018-1.378-.62-2.576-.62-1.2 0-1.574.603-2.576.637-1.03.036-1.815-1.03-2.47-1.976-1.35-1.948-2.38-5.52-0.994-7.925 0.69-1.2 1.92-1.958 3.255-1.987 1.016-.024 1.975.684 2.597.684.62 0 1.782-.845 3.007-.72 0.513.02 1.954.21 2.878 1.56-.073.045-1.72 1.006-1.753 2.946M12.96 4.63c.55-.67 0.92-1.603 0.82-2.53-.79.032-1.75.526-2.316 1.185-.506.58-.948 1.516-.83 2.41 0.885.068 1.78-.396 2.326-1.065"/>
                        </svg>
                        <span>Continue with Apple</span>
                    </button>
                    
                    <!-- Toggle between Login/Signup -->
                    <div style="text-align:center;margin-top:10px;">
                        <span id="auth-switch-text" style="color:var(--text-secondary);">Don't have an account? </span>
                        <a href="#" id="auth-switch-link" style="color:var(--accent-primary);text-decoration:none;font-weight:600;">Sign Up</a>
                    </div>
                </div>
            </div>
        </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        loginModal = document.getElementById('login-modal');
        window.loginModal = loginModal; // Make globally accessible

        // Elements
        const title = document.getElementById('auth-title');
        const nameField = document.getElementById('name-field');
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        const nameInput = document.getElementById('login-name');
        const btn = document.getElementById('perform-auth-btn');
        const togglePasswordBtn = document.getElementById('toggle-password');
        const switchText = document.getElementById('auth-switch-text');
        const switchLink = document.getElementById('auth-switch-link');
        const errorDiv = document.getElementById('auth-error');
        const successDiv = document.getElementById('auth-success');
        const forgotPasswordLink = document.getElementById('forgot-password-link');
        const forgotPasswordContainer = document.getElementById('forgot-password-container');
        const googleSignInBtn = document.getElementById('google-signin-btn');
        const appleSignInBtn = document.getElementById('apple-signin-btn');
        const strengthContainer = document.getElementById('password-strength');
        const strengthFill = document.getElementById('strength-fill');
        const strengthText = document.getElementById('strength-text');

        let isLogin = true;

        // Password Strength Calculator
        function calculatePasswordStrength(password) {
            if (!password) return { strength: 'weak', score: 0 };

            let score = 0;
            if (password.length >= 8) score++;
            if (password.length >= 12) score++;
            if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
            if (/\d/.test(password)) score++;
            if (/[^a-zA-Z\d]/.test(password)) score++;

            if (score <= 2) return { strength: 'weak', score, text: 'Weak password' };
            if (score <= 3) return { strength: 'medium', score, text: 'Medium password' };
            return { strength: 'strong', score, text: 'Strong password' };
        }

        // Password Strength Indicator
        passwordInput.addEventListener('input', () => {
            if (!isLogin) {
                const result = calculatePasswordStrength(passwordInput.value);
                strengthFill.className = `password-strength-fill ${result.strength}`;
                strengthText.className = `password-strength-text ${result.strength}`;
                strengthText.textContent = result.text;
            }
        });

        // Toggle Password Visibility
        togglePasswordBtn.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            togglePasswordBtn.textContent = type === 'password' ? '👁️' : '🙈';
        });

        // Close Modal
        document.getElementById('close-login-modal').onclick = () => {
            loginModal.style.display = 'none';
            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';
        };

        // Toggle between Login/Signup
        switchLink.onclick = (e) => {
            e.preventDefault();
            isLogin = !isLogin;
            title.textContent = isLogin ? 'Log In' : 'Sign Up';
            nameField.style.display = isLogin ? 'none' : 'block';
            strengthContainer.style.display = isLogin ? 'none' : 'block';
            forgotPasswordContainer.style.display = isLogin ? 'block' : 'none';
            btn.textContent = isLogin ? 'Log In' : 'Sign Up';
            switchText.textContent = isLogin ? "Don't have an account? " : "Already have an account? ";
            switchLink.textContent = isLogin ? 'Sign Up' : 'Log In';
            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';
        };

        // Forgot Password
        forgotPasswordLink.onclick = async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();

            if (!email) {
                errorDiv.textContent = 'Please enter your email address';
                errorDiv.style.display = 'block';
                return;
            }

            try {
                btn.classList.add('auth-loading');
                btn.disabled = true;
                await window.firebaseHelpers.sendPasswordReset(email);
                errorDiv.style.display = 'none';
                successDiv.textContent = 'Password reset email sent! Check your inbox.';
                successDiv.style.display = 'block';
            } catch (err) {
                console.error(err);
                errorDiv.textContent = err.message;
                errorDiv.style.display = 'block';
            } finally {
                btn.classList.remove('auth-loading');
                btn.disabled = false;
            }
        };

        // Google Sign-In
        // Google Sign-In
        googleSignInBtn.onclick = async () => {
            try {
                googleSignInBtn.classList.add('auth-loading');
                googleSignInBtn.disabled = true;
                errorDiv.style.display = 'none';
                await window.firebaseHelpers.signInWithGoogle();
                loginModal.style.display = 'none';
            } catch (err) {
                console.error(err);
                errorDiv.textContent = err.message;
                errorDiv.style.display = 'block';
            } finally {
                googleSignInBtn.classList.remove('auth-loading');
                googleSignInBtn.disabled = false;
            }
        };

        // Apple Sign-In
        appleSignInBtn.onclick = async () => {
            try {
                appleSignInBtn.classList.add('auth-loading');
                appleSignInBtn.disabled = true;
                errorDiv.style.display = 'none';
                await window.firebaseHelpers.signInWithApple();
                loginModal.style.display = 'none';
            } catch (err) {
                console.error(err);
                errorDiv.textContent = err.message;
                errorDiv.style.display = 'block';
            } finally {
                appleSignInBtn.classList.remove('auth-loading');
                appleSignInBtn.disabled = false;
            }
        };

        // Email/Password Auth
        btn.onclick = async () => {
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const name = nameInput.value.trim();

            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';

            // Validation
            if (!email || !password || (!isLogin && !name)) {
                errorDiv.textContent = 'Please fill in all fields';
                errorDiv.style.display = 'block';
                return;
            }

            try {
                btn.classList.add('auth-loading');
                btn.disabled = true;

                if (isLogin) {
                    await window.firebaseHelpers.signInWithEmail(email, password);
                } else {
                    const strength = calculatePasswordStrength(password);
                    if (strength.score < 2) {
                        throw new Error('Password is too weak. Use at least 8 characters with letters and numbers.');
                    }
                    await window.firebaseHelpers.signUpWithEmail(email, password, name);
                    successDiv.textContent = 'Account created! Welcome.';
                    successDiv.style.display = 'block';
                }

                setTimeout(() => {
                    loginModal.style.display = 'none';
                    errorDiv.style.display = 'none';
                    successDiv.style.display = 'none';
                }, isLogin ? 0 : 2000);
            } catch (err) {
                console.error(err);
                errorDiv.textContent = err.message;
                errorDiv.style.display = 'block';
            } finally {
                btn.classList.remove('auth-loading');
                btn.disabled = false;
            }
        };

        // Keyboard shortcut - Enter to submit
        [emailInput, passwordInput, nameInput].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    btn.click();
                }
            });
        });

        // Click outside to close
        loginModal.onclick = (e) => {
            if (e.target === loginModal) {
                loginModal.style.display = 'none';
                errorDiv.style.display = 'none';
                successDiv.style.display = 'none';
            }
        };
    }

    // Initialize the login modal
    createEnhancedLoginModal();

    window.openLoginModal = (forced = false) => {
        if (loginModal) {
            loginModal.style.display = 'flex';
            const closeBtn = document.getElementById('close-login-modal');
            if (closeBtn) {
                closeBtn.style.display = forced ? 'none' : 'block';
            }
            // Disable click outside if forced
            if (forced) {
                loginModal.onclick = null;
            }
        }
    };

    // IAP: Product Constants
    const PRODUCT_ID_MONTHLY = 'premium_monthly'; // MUST Match App Store Connect

    // IAP: Initialize Store
    document.addEventListener('deviceready', function () {
        if (!window.store) {
            console.log('Store not available');
            return;
        }

        // 1. Register Product
        store.register({
            id: PRODUCT_ID_MONTHLY,
            type: store.PAID_SUBSCRIPTION,
            alias: 'premium_monthly'
        });

        // 2. Setup Event Listeners
        // Log all events for debugging
        store.when('product').updated(function (p) {
            console.log('IAP Update:', p);
        });

        // Handle Approved Purchase (User paid)
        store.when(PRODUCT_ID_MONTHLY).approved(function (p) {
            console.log('IAP Approved:', p);
            // Verify receipt here (simulated verification for now)
            p.verify();
        });

        // Handle Verified Purchase (Receipt valid)
        store.when(PRODUCT_ID_MONTHLY).verified(async function (p) {
            console.log('IAP Verified:', p);

            if (window.currentUser) {
                await window.firebaseHelpers.updateUserSubscription(window.currentUser.uid, {
                    status: 'active',
                    plan: 'monthly',
                    expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    purchasedAt: new Date()
                });

                window.globalUserProfile.subscriptionStatus = 'active';
                localStorage.setItem('userProfile', JSON.stringify(window.globalUserProfile));

                alert("Subscription Active! Thank you.");
                window.closeModal('subscription-modal');
                window.location.reload();
            }
            p.finish();
        });

        // Handle Errors
        store.error(function (e) {
            console.error("IAP Error Global:", e);
            const subBtn = document.getElementById('subscribe-btn');
            if (subBtn) {
                subBtn.textContent = "Subscribe Error";
                subBtn.disabled = false;
                setTimeout(() => subBtn.textContent = "Subscribe Now", 3000);
            }
            alert("Store Error: " + e.message);
        });

        // 3. Refresh Store
        store.refresh();
    });

    // Real IAP Handler
    async function handleSubscription() {
        const subBtn = document.getElementById('subscribe-btn');
        if (!subBtn) return;

        // Check if plugin is ready
        if (!window.store) {
            // FALLBACK TO SIMULATION FOR WEB TESTING
            console.warn("IAP: Store not found (Web Mode). Using Simulation.");
            const originalText = subBtn.textContent;
            subBtn.textContent = " Simulating Store...";
            subBtn.disabled = true;

            try {
                await new Promise(r => setTimeout(r, 1500));
                if (window.currentUser) {
                    await window.firebaseHelpers.updateUserSubscription(window.currentUser.uid, {
                        status: 'active',
                        plan: 'monthly',
                        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                        purchasedAt: new Date()
                    });

                    window.globalUserProfile.subscriptionStatus = 'active';
                    localStorage.setItem('userProfile', JSON.stringify(window.globalUserProfile));
                }
                alert("Subscription Successful (Simulated Host)");
                window.closeModal('subscription-modal');
                window.location.reload();
            } catch (e) {
                alert("Sim fail: " + e.message);
            } finally {
                subBtn.textContent = originalText;
                subBtn.disabled = false;
            }
            return;
        }

        // NATIVE IAP FLOW
        const originalText = subBtn.textContent;
        subBtn.textContent = "Contacting App Store...";
        subBtn.disabled = true;

        try {
            // Trigger Order
            store.order(PRODUCT_ID_MONTHLY);
        } catch (e) {
            console.error("IAP Order Error:", e);
            alert("Could not start purchase: " + e.message);
            subBtn.textContent = originalText;
            subBtn.disabled = false;
        }
    }

    window.openSubscriptionModal = () => {
        window.showModal('subscription-modal');
        // Close other modals if open
        if (window.loginModal) window.loginModal.style.display = 'none';

        // Attach listener to fresh button
        const subBtn = document.getElementById('subscribe-btn');
        if (subBtn) {
            // Clone to remove old listeners
            const newBtn = subBtn.cloneNode(true);
            subBtn.parentNode.replaceChild(newBtn, subBtn);
            newBtn.addEventListener('click', handleSubscription);
        }
    };


    function loadProgress() {
        const saved = localStorage.getItem('readingProgress');
        if (saved) readingProgress = JSON.parse(saved);
        const savedReading = localStorage.getItem('currentlyReading');
        if (savedReading) currentlyReading = JSON.parse(savedReading);
        const savedStats = localStorage.getItem('stats');
        if (savedStats) stats = JSON.parse(savedStats);

        // Resume Fix: Find the TRUE latest book from readingProgress if currentlyReading is stale/empty
        if (readingProgress && Object.keys(readingProgress).length > 0) {
            let latestBookId = null;
            let latestTime = 0;

            Object.entries(readingProgress).forEach(([bid, data]) => {
                // Check 'timestamp' (local) or 'lastRead' (firestore timestamp) or 'lastPlayed'
                let ts = 0;
                if (data.timestamp) ts = new Date(data.timestamp).getTime();
                else if (data.lastRead && data.lastRead.seconds) ts = data.lastRead.seconds * 1000;
                else if (data.lastPlayed && data.lastPlayed.seconds) ts = data.lastPlayed.seconds * 1000; // fallback

                if (ts > latestTime) {
                    latestTime = ts;
                    latestBookId = bid;
                }
            });

            if (latestBookId) {
                // If we found a more recent book than what 'currentlyReading' thinks, OR if currentlyReading is null
                const currentTs = currentlyReading ? (currentlyReading.timestamp || 0) : 0;
                if (latestTime > currentTs) {
                    console.log("Found more recent book in history:", latestBookId);
                    // We need the book details (title, cover) to display it effectively
                    // Try to find it in loaded books or readingProgress metadata
                    const recentData = readingProgress[latestBookId];
                    const bookFromList = books.find(b => b.id === latestBookId);

                    currentlyReading = {
                        bookId: latestBookId,
                        ...recentData,
                        title: bookFromList ? bookFromList.title : (recentData.title || 'Resume Book'),
                        author: bookFromList ? bookFromList.author : (recentData.author || ''),
                        coverUrl: bookFromList ? bookFromList.coverUrl : (recentData.coverUrl || '')
                    };
                    localStorage.setItem('currentlyReading', JSON.stringify(currentlyReading));
                }
            }
        }

        // Load Profile
        const savedProfile = localStorage.getItem('userProfile');
        if (savedProfile) {
            userProfile = JSON.parse(savedProfile);
            window.globalUserProfile = userProfile;
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
    // Splash Screen Enhancement Logic
    function initSplashAnimations() {
        const marquee = document.getElementById('splash-marquee');
        if (!marquee) return;

        const demoTitles = [
            'Atomic Habits', 'The Alchemist', 'Deep Work', 'Project Hail Mary',
            'The Midnight Library', 'Dune', 'Sapiens', '1984', 'Educated',
            'The Great Gatsby', 'Becoming', 'Zero to One', 'Thinking Fast and Slow',
            'Circe', 'The Silent Patient', 'Anxious People', 'A Promised Land',
            'The 7 Habits', 'Good to Great', 'Rich Dad Poor Dad', 'Harry Potter',
            'Lord of the Rings', 'The Martian', 'Ready Player One', 'The Hobbit'
        ];
        const allTitles = [...demoTitles, ...demoTitles, ...demoTitles, ...demoTitles];

        const createLayer = (isNear) => allTitles.sort(() => Math.random() - 0.5).map((t, i) => `
            <div class="marquee-item ${isNear ? 'near' : ''}" style="--delay: ${Math.random() * 5}s;">
                ${t}
            </div>
        `).join('');

        marquee.innerHTML = `
            <div class="marquee-layer-1">${createLayer(false)}</div>
            <div class="marquee-layer-2">${createLayer(true)}</div>
        `;
    }
    initSplashAnimations();

    function updateSplashProgress(percent, status) {
        const bar = document.getElementById('splash-progress');
        const statusEl = document.getElementById('splash-status');
        const percentEl = document.getElementById('splash-percent');
        if (bar) bar.style.width = `${percent}%`;
        if (statusEl) statusEl.textContent = status;
        if (percentEl) percentEl.textContent = `${Math.round(percent)}%`;
    }

    // Fetch books from Firebase with progress tracking
    if (!window.firebaseHelpers) {
        console.error("CRITICAL: firebaseHelpers not found!");
        updateSplashProgress(0, "Error: SDK Missing");
        setTimeout(() => alert("System Error: Firebase not initialized."), 500);
        return;
    }

    console.log("Starting book fetch...");
    updateSplashProgress(20, "Connecting to Cloud...");

    window.firebaseHelpers.getBooks()
        .then(data => {
            updateSplashProgress(60, "Processing Library...");
            console.log(`[DEBUG] Fetched ${data.length} books from Firestore.`);

            books = data;
            window.books = books;

            updateSplashProgress(80, "Resuming Session...");
            loadProgress();
            setGreeting();

            if (!currentlyReading && books.length > 0) {
                currentlyReading = { bookId: books[0].id, progress: 0, chapter: 1, totalChapters: 1 };
                saveProgress();
            }

            updateSplashProgress(100, "Ready!");

            // Smooth exit
            setTimeout(() => {
                const splash = document.getElementById('splash-screen');
                if (splash) {
                    splash.style.opacity = '0';
                    splash.style.transform = 'scale(1.1)';
                    setTimeout(() => splash.remove(), 800);
                }

                // MANDATORY AUTH WALL: Force login if guest
                if (!window.currentUser || userProfile.isGuest) {
                    console.log("Auth Wall: Forcing login modal...");
                    window.openLoginModal(true); // true = forced/no close
                } else {
                    renderHome();
                }
            }, 500);
        })
        .catch(error => {
            console.error('Error loading books:', error);
            updateSplashProgress(0, "Connection Failed");

            const splash = document.getElementById('splash-screen');
            // Keep splash but show error inside glass card
            const glassCard = document.querySelector('.splash-glass-card');
            if (glassCard) {
                glassCard.innerHTML = `
                    <div style="font-size:4rem;margin-bottom:20px;">⚠️</div>
                    <h3 style="color:#fff;margin-bottom:10px;">Load Error</h3>
                    <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:20px;">${error.message}</p>
                    <button class="btn-primary" onclick="window.location.reload()" style="padding:10px 24px;border-radius:12px;">Retry Connection</button>
                `;
            } else if (splash) {
                splash.remove();
            }
        });

    function getCoverUrl(book) {
        return book.coverUrl || 'placeholder.svg';
    }

    // Helper: Extract valid categories from books
    function getAvailableCategories(bookList) {
        if (!bookList || bookList.length === 0) return [];
        const raw = bookList.map(b => b.category).filter(c => c && typeof c === 'string' && c.trim() !== '');
        return [...new Set(raw.map(c => c.trim()))].sort();
    }

    function renderHome() {
        // Restore standard header if we came back from a sub-page
        const topBar = document.querySelector('.top-bar');
        if (topBar) {
            const backContainer = topBar.querySelector('.nav-back-container');
            if (backContainer) backContainer.remove();
            const header = topBar.querySelector('.top-bar-header');
            if (header) header.style.display = 'flex';
            const titleEl = topBar.querySelector('.app-title');
            if (titleEl) titleEl.style.display = 'block';
        }

        const uniqueCategories = getAvailableCategories(books);
        const tabsHtml = `
            <div class="tab active" data-category="all">All Books</div>
            ${uniqueCategories.map(cat => `<div class="tab" data-category="${cat}">${cat}</div>`).join('')}
        `;

        const currentBook = books.find(b => b.id === currentlyReading?.bookId);

        mainContent.innerHTML = `<div class="section-title">CONTINUE READING</div><div class="continue-reading-card" onclick="resumeReading()"><img src="${currentBook ? getCoverUrl(currentBook) : 'placeholder.svg'}" class="continue-reading-cover" alt="${currentBook?.title || 'Book'}" onerror="this.src='placeholder.svg'"><div class="continue-reading-info"><div><div class="continue-reading-title" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${currentBook?.title || 'No Book'}</div><div class="continue-reading-author">${currentBook?.author || ''}</div></div><div><div class="progress-bar"><div class="progress-fill" style="width:${currentlyReading?.progress || 0}%"></div></div><div class="progress-text">Chapter ${currentlyReading?.chapter || 0} of ${currentlyReading?.totalChapters || 0} - ${currentlyReading?.progress || 0}% completed</div><button class="resume-btn" onclick="event.stopPropagation();resumeReading();">Resume</button></div></div></div><div class="stats-grid"><div class="stat-card"><div class="stat-icon">🔥</div><div class="stat-label">Streak</div><div class="stat-value">${stats.streak} days</div></div><div class="stat-card"><div class="stat-icon">🕐</div><div class="stat-label">This week</div><div class="stat-value">${stats.weekMinutes} min</div></div><div class="stat-card"><div class="stat-icon">✓</div><div class="stat-label">Completed</div><div class="stat-value">${stats.completedBooks} books</div></div></div><div class="tabs-container">${tabsHtml}</div>`;

        // TRIAL WALL: If trial expired, show subscription overlay
        if (!window.isTrialActive()) {
            mainContent.innerHTML += `
                <div style="background:var(--bg-card);border-radius:24px;padding:32px;text-align:center;margin:20px 0;border:1px solid var(--border-color);box-shadow:0 12px 40px rgba(0,0,0,0.3);">
                    <div style="font-size:3.5rem;margin-bottom:16px;">⌛</div>
                    <h2 style="font-size:1.4rem;font-weight:800;margin-bottom:8px;color:var(--text-primary);">Trial Expired</h2>
                    <p style="color:var(--text-secondary);font-size:0.95rem;margin-bottom:24px;line-height:1.5;">Your 14-day free trial has ended. Subscribe for just <strong>$8.50/month</strong> to continue listening to your library.</p>
                    <button class="btn-primary" style="width:100%;padding:14px;border-radius:16px;font-weight:700;">Subscribe Now</button>
                    <p style="margin-top:16px;font-size:0.8rem;color:var(--text-secondary);opacity:0.6;">Cancel anytime • Ad-free experience</p>
                </div>
            `;
        } else {
            mainContent.innerHTML += `<div class="books-grid" id="books-grid"></div><div class="section-header"><div class="section-header-title">Recommended</div><div class="see-all">See all ›</div></div><div class="books-grid grid-layout" id="recommended-grid"></div>`;
            renderBooksGrid(books.slice(0, 9), document.getElementById('books-grid'));
            renderBooksGrid(books.slice(9, 15), document.getElementById('recommended-grid'));
        }
        renderBooksGrid(books.slice(0, 9), document.getElementById('books-grid'));
        renderBooksGrid(books.slice(9, 15), document.getElementById('recommended-grid'));

        setupTabs();
        setupSeeAll();

        // Enhance scrolling
        if (window.CategoryEnhance) {
            window.CategoryEnhance.initHorizontalScroll('.books-grid');
            window.CategoryEnhance.initHorizontalScroll('.tabs-container');
        }
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
        if (!container) return;

        container.innerHTML = booksToRender.map(book => `
            <div class="book-card" onclick="openReader('${book.id}')">
                <img src="${book.coverUrl || 'placeholder.svg'}" alt="${book.title}" class="book-cover" onerror="this.src='placeholder.svg'">
                <div class="book-title">${book.title}</div>
                <div class="book-author">${book.author}</div>
            </div>
        `).join('');
    }

    function renderDiscover() {
        if (window.CategoryEnhance) {
            window.CategoryEnhance.renderBackButton('Discover Books', () => renderHome());
        }

        // TRIAL WALL: If trial expired, show subscription overlay
        if (!window.isTrialActive()) {
            mainContent.innerHTML = `
                <div style="background:var(--bg-card);border-radius:24px;padding:32px;text-align:center;margin:20px 0;border:1px solid var(--border-color);box-shadow:0 12px 40px rgba(0,0,0,0.3);">
                    <div style="font-size:3.5rem;margin-bottom:16px;">⌛</div>
                    <h2 style="font-size:1.4rem;font-weight:800;margin-bottom:8px;color:var(--text-primary);">Trial Expired</h2>
                    <p style="color:var(--text-secondary);font-size:0.95rem;margin-bottom:24px;line-height:1.5;">Your 14-day free trial has ended. Subscribe for just <strong>$8.50/month</strong> to continue listening to your library.</p>
                    <button class="btn-primary" style="width:100%;padding:14px;border-radius:16px;font-weight:700;" onclick="window.openSubscriptionModal()">Subscribe Now</button>
                    <p style="margin-top:16px;font-size:0.8rem;color:var(--text-secondary);opacity:0.6;">Cancel anytime • Ad-free experience</p>
                </div>
            `;
            return;
        }

        // Dynamic Categories from available books
        const categories = getAvailableCategories(books);

        let discoveryHtml = `<div class="discovery-container">`;

        // Add a "Trending" row
        discoveryHtml += `
            <div class="section-header"><div class="section-header-title">Trending Now</div></div>
            <div class="books-grid" id="trending-grid"></div>
        `;

        // Generate Containers
        categories.forEach((cat, index) => {
            // Create a simple, safe ID based on index to avoid character issues
            const gridId = `grid-category-${index}`;
            discoveryHtml += `
                <div class="section-header"><div class="section-header-title">${cat}</div></div>
                <div class="books-grid" id="${gridId}"></div>
            `;
        });

        discoveryHtml += `</div>`; // Close container
        mainContent.innerHTML = discoveryHtml;

        // Render Data
        renderBooksGrid(books.slice(0, 10), document.getElementById('trending-grid'));

        categories.forEach((cat, index) => {
            const gridId = `grid-category-${index}`;
            const filtered = books.filter(b => b.category && b.category.trim() === cat);
            const grid = document.getElementById(gridId);
            if (grid) renderBooksGrid(filtered, grid);
        });

        if (window.CategoryEnhance) {
            window.CategoryEnhance.initHorizontalScroll('.books-grid');
        }


    }

    async function renderLibrary() {
        mainContent.innerHTML = `
            <div class="section-header"><div class="section-header-title">My Library</div></div>
            <div id="library-container" style="min-height: 200px; display: flex; justify-content: center; align-items: center;">
                <div class="loader"></div>
            </div>
        `;

        if (!window.currentUser || userProfile.isGuest) {
            document.getElementById('library-container').innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:var(--text-secondary);">
                    <p style="font-size:3rem;margin-bottom:16px;">🔒</p>
                    <p style="font-size:1.1rem;color:var(--text-primary);margin-bottom:8px;">Sign in to view Library</p>
                    <p style="font-size:0.9rem;">Save books to read them later</p>
                </div>`;
            return;
        }

        try {
            // Ensure currentUser is indeed set and not just a legacy pointer
            if (!window.firebaseAuth.currentUser) {
                console.warn("Library: User seems logged in UI but not in Firebase Auth. Waiting...");
                // Brief poll to wait for Firebase
                let waitCount = 0;
                while (!window.firebaseAuth.currentUser && waitCount < 5) {
                    await new Promise(r => setTimeout(r, 500));
                    waitCount++;
                }
                if (!window.firebaseAuth.currentUser) throw new Error("Authentication timeout. Please re-login.");
            }

            const userDocPath = `users/${window.firebaseAuth.currentUser.uid}`;
            console.log("Library Debug: Fetching User Doc for Library list:", userDocPath);

            const userDoc = await window.firebaseFirestore.collection('users').doc(window.firebaseAuth.currentUser.uid).get();
            let libraryIds = [];

            if (userDoc.exists && userDoc.data().library) {
                libraryIds = userDoc.data().library;
                console.log("Library Debug: IDs found in Doc field:", libraryIds);
            } else {
                console.log("Library Debug: Doc field empty, falling back to subcollection (might error)...");
                try {
                    const snapshot = await window.firebaseFirestore.collection('users')
                        .doc(window.firebaseAuth.currentUser.uid).collection('library').get();
                    libraryIds = snapshot.docs.map(doc => doc.id);
                    console.log("Library Debug: IDs found in subcollection:", libraryIds);
                } catch (subErr) {
                    console.warn("Library Debug: Subcollection access fully blocked.");
                    if (libraryIds.length === 0) {
                        // If both failed and we have no IDs, but doc exists, it's just empty
                        console.log("Library Debug: Library is confirmed empty.");
                    }
                }
            }
            console.log("Library IDs found:", libraryIds);

            if (libraryIds.length === 0) {
                document.getElementById('library-container').innerHTML = `
                    <div style="text-align:center;padding:60px 20px;color:var(--text-secondary);">
                        <p style="font-size:4rem;margin-bottom:16px;">📚</p>
                        <p style="font-size:1.1rem;color:var(--text-primary);margin-bottom:8px;">Your library is empty</p>
                        <p style="font-size:0.9rem;">Bookmark books to see them here</p>
                    </div>`;
                return;
            }

            const libraryBooks = books.filter(b => libraryIds.includes(b.id));

            // Re-use container for grid
            const container = document.getElementById('library-container');
            container.style.display = 'grid';
            container.style.gridTemplateColumns = 'repeat(2, 1fr)'; // Grid layout fix
            container.style.gap = '15px';
            container.className = 'books-grid grid-layout'; // Add grid-layout class
            container.innerHTML = ''; // Clear loader
            renderBooksGrid(libraryBooks, container);

        } catch (e) {
            console.error("CRITICAL Library Error:", e);
            console.dir(e); // Log full object for inspection
            document.getElementById('library-container').innerHTML = `
                <div style="text-align:center;padding:40px 20px;color:#ef4444;">
                    <p style="font-size:3rem;margin-bottom:16px;">❌</p>
                    <p style="font-size:1.1rem;font-weight:700;margin-bottom:8px;">Error loading library</p>
                    <p style="font-size:0.9rem;opacity:0.8;margin-bottom:20px;">${e.message || 'Unknown permission error'}</p>
                    <button onclick="renderLibrary()" class="retry-btn" style="background:var(--accent-primary);color:white;border:none;padding:10px 24px;border-radius:12px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(245,158,11,0.3);">Retry</button>
                    ${e.code ? `<p style="font-size:0.7rem;margin-top:10px;opacity:0.5;">Code: ${e.code}</p>` : ''}
                </div>`;
        }
    }

    function renderProfile() {
        if (window.CategoryEnhance) {
            window.CategoryEnhance.renderBackButton('My Profile', () => renderHome());
        }
        const avatarHtml = userProfile.image
            ? `<img src="${userProfile.image}" class="profile-avatar">`
            : `<div class="profile-placeholder">${userProfile.name.charAt(0).toUpperCase()}</div>`;

        const loginBtnHtml = userProfile.isGuest
            ? `<button class="btn-primary" style="width:100%;margin-bottom:12px;" id="login-btn">Log In</button>`
            : `<button class="btn-secondary" style="width:100%;color:#ef4444;" id="logout-btn"><span>🚪</span> Log Out</button>`;

        const editBtnHtml = `<button class="btn-primary" style="width:100%;" id="edit-profile-btn">Edit Profile</button>`;
        const settingsBtnHtml = `<button class="btn-secondary" style="width:100%; margin-top: 12px;" id="settings-btn">⚙️ Settings</button>`;
        const supportBtnHtml = `<button class="btn-secondary" style="width:100%; margin-top: 12px;" id="contact-support-btn">💬 Contact Support</button>`;

        mainContent.innerHTML = `
            <div class="profile-header">
            <div class="profile-avatar-container">
                ${avatarHtml}
            </div>
            <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:4px;color:var(--text-primary);">${userProfile.name}</h2>
            <p style="color:var(--text-secondary);margin-bottom:16px;">${userProfile.email}</p>
            <div class="profile-bio">${userProfile.bio || 'No bio yet.'}</div>
            
            <div class="profile-stats">
                <div class="stat-item">
                    <span class="stat-value">${stats.weekMinutes}</span>
                    <span class="stat-label">Min Read</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.completedBooks}</span>
                    <span class="stat-label">Books</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.streak}</span>
                    <span class="stat-label">Streak</span>
                </div>
            </div>
        </div>

        <div class="profile-menu">
            <div class="section-header"><div class="section-header-title">Account Settings</div></div>
            ${userProfile.isGuest ? '' : editBtnHtml}
            ${loginBtnHtml}
            ${settingsBtnHtml}
            ${supportBtnHtml}
        </div>
    `;

        // Attach Event Listeners
        const editBtn = document.getElementById('edit-profile-btn');
        const settingsBtn = document.getElementById('settings-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const loginBtn = document.getElementById('login-btn');

        if (editBtn) editBtn.addEventListener('click', () => window.openProfileModal());
        if (settingsBtn) settingsBtn.addEventListener('click', () => window.openSettingsModal());
        if (logoutBtn) logoutBtn.addEventListener('click', () => window.openLogoutModal());

        // Listener for Support Button
        const supportBtn = document.getElementById('contact-support-btn');
        if (supportBtn) supportBtn.addEventListener('click', () => window.openSupportModal());

        if (loginBtn) loginBtn.addEventListener('click', () => window.showModal('login-modal'));
    }



    // Profile Functions
    window.openProfileModal = function () {
        if (userProfile.isGuest) {
            alert("Please Log In to customize your profile and save your progress permanently.");
            window.showModal('login-modal');
            return;
        }
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

        window.showModal('profile-modal');
    };

    window.openSettingsModal = function () {
        window.showModal('settings-modal');
    };

    window.openLogoutModal = function () {
        window.showModal('logout-modal');
    };

    // Support System Logic
    window.openSupportModal = function () {
        window.showModal('support-modal');
        // Reset to New Ticket tab
        window.switchSupportTab('new');
    };

    window.switchSupportTab = function (tabName) {
        // Toggle Tabs
        document.querySelectorAll('.support-tab').forEach(t => t.classList.remove('active'));
        if (tabName === 'new') document.getElementById('tab-new-ticket').classList.add('active');
        if (tabName === 'history') document.getElementById('tab-history').classList.add('active');

        // Toggle Views
        const newView = document.getElementById('view-new-ticket');
        const historyView = document.getElementById('view-ticket-history');

        if (tabName === 'new') {
            newView.style.display = 'block';
            historyView.style.display = 'none';
        } else {
            newView.style.display = 'none';
            historyView.style.display = 'block';
            window.renderTicketHistory();
        }
    };

    window.submitTicket = async function () {
        const category = document.getElementById('ticket-category').value;
        const subject = document.getElementById('ticket-subject').value.trim();
        const message = document.getElementById('ticket-message').value.trim();
        const btn = document.getElementById('submit-ticket-btn');

        if (!subject || !message) {
            alert("Please fill in both subject and message.");
            return;
        }

        try {
            btn.disabled = true;
            btn.textContent = "Submitting...";

            await window.firebaseHelpers.createSupportTicket(window.currentUser.uid, {
                email: userProfile.email,
                category,
                subject,
                message
            });

            alert("Ticket Submitted Successfully! We will get back to you shortly.");

            // Clear Form
            document.getElementById('ticket-subject').value = '';
            document.getElementById('ticket-message').value = '';

            // Switch to History
            window.switchSupportTab('history');

        } catch (error) {
            alert("Error submitting ticket: " + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = "Submit Ticket";
        }
    };

    window.renderTicketHistory = async function () {
        const container = document.getElementById('ticket-list-container');
        container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); margin-top: 40px;">Loading tickets...</div>';

        const tickets = await window.firebaseHelpers.getUserSupportTickets(window.currentUser.uid);

        if (tickets.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--text-secondary); margin-top: 40px;">
                    <div style="font-size: 2rem; margin-bottom: 12px;">🎫</div>
                    <p>No tickets found.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = tickets.map(ticket => `
            <div class="ticket-card" style="background: var(--card-bg); padding: 16px; border-radius: 12px; margin-bottom: 12px; border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">${ticket.subject}</div>
                    <div class="ticket-status ${ticket.status.toLowerCase()}" 
                         style="font-size: 0.75rem; padding: 4px 8px; border-radius: 12px; background: ${getStatusColor(ticket.status)}; color: white;">
                        ${ticket.status}
                    </div>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">
                    ${ticket.category} • ${new Date(ticket.createdAt.seconds * 1000).toLocaleDateString()}
                </div>
                <div style="font-size: 0.9rem; color: var(--text-primary); line-height: 1.4;">
                    ${ticket.message.substring(0, 100)}${ticket.message.length > 100 ? '...' : ''}
                </div>
            </div>
        `).join('');
    };

    function getStatusColor(status) {
        switch (status.toLowerCase()) {
            case 'open': return '#3b82f6'; // Blue
            case 'pending': return '#f59e0b'; // Amber
            case 'closed': return '#10b981'; // Green
            default: return '#6b7280'; // Gray
        }
    }

    // Logout Logic with State Clearing
    window.logout = function () {
        window.firebaseHelpers.signOut().then(() => {
            // Hard Reset - Clear ALL LocalStorage
            localStorage.clear();

            // Reset In-Memory State
            userProfile = {
                name: 'Guest User',
                email: 'guest@example.com',
                bio: 'Avid reader and book collector.',
                image: null,
                isGuest: true
            };
            window.globalUserProfile = userProfile;
            stats = { streak: 0, weekMinutes: 0, completedBooks: 0 };
            readingProgress = {};
            currentlyReading = null;

            // Update UI
            setTheme(true); // Default to dark
            if (notificationsToggle) notificationsToggle.checked = true;

            saveProfile(); // Re-save guest profile to prevent null errors

            if (logoutModal) logoutModal.style.display = 'none';

            // Redirect or Refresh to ensure clean state
            alert("Logged out successfully.");
            window.location.reload();
        });
    };

    // Delete Account Logic
    const confirmDeleteBtn = document.getElementById('confirm-delete-account-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (!window.currentUser) return;

            const originalText = confirmDeleteBtn.textContent;
            confirmDeleteBtn.textContent = "Deleting...";
            confirmDeleteBtn.disabled = true;

            try {
                await window.firebaseHelpers.deleteUserData(window.currentUser.uid);
                alert("Account deleted. We are sorry to see you go.");

                // Perform logout cleanup
                localStorage.clear();
                window.location.reload();
            } catch (error) {
                console.error("Delete Account Error:", error);
                alert("Failed to delete account. You may need to re-login purely for security reasons before deleting.");
                confirmDeleteBtn.textContent = originalText;
                confirmDeleteBtn.disabled = false;
            }
        });
    }

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
        saveProfileBtn.addEventListener('click', async () => {
            const newName = profileNameInput.value.trim();
            const newEmail = profileEmailInput.value.trim();
            const newBio = profileBioInput.value.trim();

            if (newName && newEmail) {
                const originalText = saveProfileBtn.textContent;
                saveProfileBtn.textContent = "Saving...";
                saveProfileBtn.disabled = true;

                userProfile.name = newName;
                userProfile.email = newEmail;
                userProfile.bio = newBio;

                // Save image if uploaded
                if (profilePreview.style.display === 'block') {
                    userProfile.image = profilePreview.src;
                }

                try {
                    await saveProfile();
                    saveProfileBtn.textContent = "Saved! ✓";
                    saveProfileBtn.style.backgroundColor = "#10b981"; // Success green

                    setTimeout(() => {
                        saveProfileBtn.textContent = originalText;
                        saveProfileBtn.style.backgroundColor = ""; // Reset
                        saveProfileBtn.disabled = false;
                        profileModal.style.display = 'none';
                    }, 1000);
                } catch (err) {
                    console.error("Save Profile Error:", err);
                    alert("Failed to save profile. Please try again.");
                    saveProfileBtn.textContent = originalText;
                    saveProfileBtn.style.backgroundColor = "";
                    saveProfileBtn.disabled = false;
                }
            } else {
                alert("Name and Email are required.");
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
        document.getElementById('modal-price').textContent = `$${price.toFixed(2)} `;
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
}

// Start Init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Modal Helper Functions (must be outside DOMContentLoaded so they're always available)
window.showModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.style.alignItems = 'flex-end'; // Match CSS modal class
    }
};

window.showModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        // Ensure child elements like close buttons work
        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn && !closeBtn.onclick) {
            closeBtn.onclick = () => window.closeModal(modalId);
        }
    }
};

window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
};

// Make saveProfile accessible globally
window.saveProfile = function () {
    localStorage.setItem('userProfile', JSON.stringify(window.globalUserProfile));

    if (window.currentUser && !window.globalUserProfile.isGuest) {
        window.firebaseHelpers.updateUserProfile(window.currentUser.uid, window.globalUserProfile);
    }
};


async function openPlayer(bookOrId) {
    // Handle both book object and ID string
    const book = typeof bookOrId === 'string'
        ? (window.books || []).find(b => b.id === bookOrId)
        : bookOrId;

    if (!book) {
        console.error("openPlayer: Book not found", bookOrId);
        return;
    }
    console.log("Opening player for:", book.title);

    // Check if user is logged in
    if (!window.currentUser) {
        // Show login modal using the global showModal function
        if (window.showModal) {
            window.showModal('login-modal');
        } else {
            // Fallback in case showModal isn't ready yet
            const modal = document.getElementById('login-modal');
            if (modal) {
                modal.style.display = 'flex';
                modal.style.alignItems = 'flex-end'; // Needed for CSS modal animation
            }
        }
        return;
    }

    try {
        // SUBSCRIPTION CHECK
        if (!canAccess) {
            console.log("Access blocked. Showing subscription modal.");
            window.openSubscriptionModal();
            return;
        }

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
        window.location.href = `player.html?v=3.0&${params.toString()}`;
    } catch (error) {
        console.error("Error getting file URL:", error);
        alert("Could not open audiobook. Please try again.");
    }
}

// Subscription Helper (Unified with Trial)
async function checkSubscriptionAccess(user) {
    return window.isTrialActive();
}

// Keep old name for compatibility
window.openReader = openPlayer;
window.openPlayer = openPlayer;
