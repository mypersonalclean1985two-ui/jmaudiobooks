// Web App Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA1IsKLrSwH-yEGp2lKRk0mky__fQ4ivGU",
    authDomain: "book-258ee.firebaseapp.com",
    projectId: "book-258ee",
    storageBucket: "book-258ee.firebasestorage.app",
    messagingSenderId: "429711777820",
    appId: "1:429711777820:web:1d0060234dadad76fabfd9"
};

// Initialize Firebase
console.log("Firebase: Starting initialization...");
if (typeof firebase === 'undefined') {
    console.error("Firebase SDK not found! Local load failed.");
    console.error("System Error: Firebase SDK could not be loaded locally.");
    // Stop execution here or provide fallbacks
} else {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("Firebase: Initialization successful.");
        }
    } catch (e) {
        console.error("Firebase: Initialization failed!", e);
        console.error("Firebase Init Error: " + e.message);
    }
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// FIX: Force Long Polling for Capacitor/iOS connection issues
db.settings({
    experimentalForceLongPolling: true
});

// Set session persistence to LOCAL (default, but explicit)
// In incognito/private mode, this will use sessionStorage instead
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((error) => {
        console.error('Error setting persistence:', error);
    });

// Handle Redirect Results (Crucial for Mobile/Capacitor)
auth.getRedirectResult()
    .then((result) => {
        if (result.user) {
            console.log("Logged in via redirect:", result.user.email);
        }
    }).catch((error) => {
        console.error("Auth redirect error:", error);
    });

// Export for use in other files
window.firebaseAuth = auth;
window.firebaseDB = db;
window.firebaseFirestore = db; // Alias for consistency
window.firebaseStorage = storage;

// Auth state observer
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User signed in:', user.email);
        window.currentUser = user;

        // Initialize user document if it doesn't exist, OR update if it does but lacks info
        db.collection('users').doc(user.uid).get().then((doc) => {
            const updates = {};
            if (!doc.exists) {
                updates.email = user.email;
                updates.displayName = user.displayName || 'User';
                updates.photoURL = user.photoURL || '';
                updates.trialStartDate = firebase.firestore.FieldValue.serverTimestamp();
                updates.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                db.collection('users').doc(user.uid).set(updates);

                // Initialize stats
                db.collection('users').doc(user.uid).collection('stats').doc('current').set({
                    streak: 0,
                    weekMinutes: 0,
                    completedBooks: 0,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                const data = doc.data();
                // If the name in Firestore is generic but Auth has a real name (e.g. from Google), update it
                if ((!data.displayName || data.displayName === 'User' || data.displayName === 'Guest User') && user.displayName) {
                    updates.displayName = user.displayName;
                }
                if (!data.photoURL && user.photoURL) {
                    updates.photoURL = user.photoURL;
                }

                if (Object.keys(updates).length > 0) {
                    db.collection('users').doc(user.uid).update(updates);
                }
            }
        });
    } else {
        console.log('User signed out');
        window.currentUser = null;

        // Clear all stored user data on signout
        localStorage.removeItem('userProfile');
        localStorage.removeItem('readingProgress');
        localStorage.removeItem('stats');
        localStorage.removeItem('currentlyReading');
    }

    // Trigger app re-render if needed
    if (window.onAuthStateChanged) {
        window.onAuthStateChanged(user);
    }
});

// Helper functions
window.firebaseHelpers = {
    signInWithGoogle: async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            await auth.signInWithRedirect(provider);
        } catch (error) {
            console.error('Error signing in with Google:', error);
            throw error;
        }
    },
    signInWithApple: async () => {
        // Native iOS Flow using @capacitor-community/apple-sign-in
        const SignInWithApple = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SignInWithApple;

        if (SignInWithApple) {
            console.log("Apple Sign-In: detected Native Plugin (@capacitor-community).");
            try {
                // 1. Request from Apple
                // 'clientId' and 'redirectURI' are optional/ignored for native, but good for completeness if config demands
                const response = await SignInWithApple.authorize({
                    clientId: 'com.jmaudiobooks.jmaudiobooks', // Match Bundle ID
                    redirectURI: 'https://book-258ee.firebaseapp.com/__/auth/handler',
                    scopes: 'name email',
                    state: 'INIT_SIGNIN'
                });

                console.log("Apple Native Response:", response);

                if (!response.response || !response.response.identityToken) {
                    throw new Error("No identity token returned from Apple.");
                }

                // 2. Create Credential
                const provider = new firebase.auth.OAuthProvider('apple.com');
                const credential = provider.credential({
                    idToken: response.response.identityToken,
                    rawNonce: response.response.nonce || null
                });

                // 3. Sign in
                const result = await auth.signInWithCredential(credential);

                // 4. Update Profile (Apple only sends name ONCE, on first login)
                // The plugin structure puts name in `response.response.givenName` or `response.response.fullName`
                // We check different fields depending on plugin version variations
                const givenName = response.response.givenName;
                const familyName = response.response.familyName;

                if (givenName) {
                    const name = `${givenName} ${familyName || ''}`.trim();
                    console.log("Got Apple Name:", name);
                    if (result.user) {
                        try {
                            await result.user.updateProfile({ displayName: name });
                            await db.collection('users').doc(result.user.uid).set({
                                displayName: name,
                                email: result.user.email
                            }, { merge: true });
                        } catch (e) { console.error("Name update warn:", e); }
                    }
                }
                return;

            } catch (error) {
                console.error("Native Apple Sign-In Failed:", error);
                throw error;
            }
        }

        // Web Fallback
        const provider = new firebase.auth.OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');
        try {
            await auth.signInWithRedirect(provider);
        } catch (error) {
            console.error('Error signing in with Apple:', error);
            throw error;
        }
    },
    signInWithEmail: async (email, password) => {
        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            console.error('Error signing in:', error);
            throw error;
        }
    },
    signUpWithEmail: async (email, password, displayName) => {
        try {
            const result = await auth.createUserWithEmailAndPassword(email, password);
            await result.user.updateProfile({ displayName });

            // Explicitly create the user document here to ensure we have the correct display name
            // This overrides the onAuthStateChanged check which might run with 'Guest User' if called too early
            await db.collection('users').doc(result.user.uid).set({
                email: email,
                displayName: displayName,
                photoURL: '',
                trialStartDate: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }); // Merge to avoid overwriting if it somehow already exists

            // Initialize stats if needed (safe to do here too)
            const statsDoc = await db.collection('users').doc(result.user.uid).collection('stats').doc('current').get();
            if (!statsDoc.exists) {
                await db.collection('users').doc(result.user.uid).collection('stats').doc('current').set({
                    streak: 0,
                    weekMinutes: 0,
                    completedBooks: 0,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            // User created successfully

        } catch (error) {
            console.error('Error signing up:', error);
            throw error;
        }
    },
    sendPasswordReset: async (email) => {
        try {
            await auth.sendPasswordResetEmail(email);
        } catch (error) {
            console.error('Error sending password reset email:', error);
            throw error;
        }
    },
    signOut: async () => {
        try {
            await auth.signOut();
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    },
    getUserProfile: async (userId) => {
        try {
            const doc = await db.collection('users').doc(userId).get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('Error getting user profile:', error);
            return null;
        }
    },
    getBooks: async () => {
        try {
            console.log("getBooks: Fetching from Firestore...");
            console.log("getBooks: Fetching from Firestore...");
            // Use default source (cache then server) for better mobile reliability
            const snapshot = await db.collection('books').get();
            console.log(`getBooks: Successfully fetched ${snapshot.docs.length} books.`);
            if (window.Capacitor) console.log(`Diagnostic: Successfully loaded ${snapshot.docs.length} books.`);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting books:', error);
            console.error('Error getting books:', error);
            return [];
        }
    },
    getReadingProgress: async (userId) => {
        try {
            const snapshot = await db.collection('users').doc(userId)
                .collection('readingProgress').get();
            const progress = {};
            snapshot.docs.forEach(doc => {
                progress[doc.id] = doc.data();
            });
            return progress;
        } catch (error) {
            console.error('Error getting reading progress:', error);
            return {};
        }
    },
    updateReadingProgress: async (userId, bookId, progressData) => {
        try {
            await db.collection('users').doc(userId)
                .collection('readingProgress').doc(bookId).set({
                    ...progressData,
                    lastRead: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
        } catch (error) {
            console.error('Error updating reading progress:', error);
        }
    },
    getStats: async (userId) => {
        try {
            const doc = await db.collection('users').doc(userId)
                .collection('stats').doc('current').get();
            return doc.exists ? doc.data() : { streak: 0, weekMinutes: 0, completedBooks: 0 };
        } catch (error) {
            console.error('Error getting stats:', error);
            return { streak: 0, weekMinutes: 0, completedBooks: 0 };
        }
    },
    updateStats: async (userId, statsData) => {
        try {
            await db.collection('users').doc(userId)
                .collection('stats').doc('current').set({
                    ...statsData,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    },
    updateUserProfile: async (userId, profileData) => {
        try {
            const user = auth.currentUser;
            if (user) {
                await user.updateProfile({
                    displayName: profileData.name,
                    photoURL: profileData.image
                });
            }
            await db.collection('users').doc(userId).set({
                displayName: profileData.name,
                photoURL: profileData.image,
                email: profileData.email, // Keep email in sync
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    },
    getUserSettings: async (userId) => {
        try {
            const doc = await db.collection('users').doc(userId)
                .collection('settings').doc('current').get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('Error getting settings:', error);
            return null;
        }
    },
    updateUserSettings: async (userId, settingsData) => {
        try {
            await db.collection('users').doc(userId)
                .collection('settings').doc('current').set({
                    ...settingsData,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
        } catch (error) {
            console.error('Error updating settings:', error);
        }
    },
    // Support System
    createSupportTicket: async (userId, ticketData) => {
        try {
            await db.collection('support_tickets').add({
                userId: userId,
                userEmail: ticketData.email || 'unknown',
                subject: ticketData.subject,
                category: ticketData.category,
                message: ticketData.message,
                status: 'Open',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error creating ticket:', error);
            throw error;
        }
    },
    getUserSupportTickets: async (userId) => {
        try {
            const snapshot = await db.collection('support_tickets')
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting tickets:', error);
            return [];
        }
    },
    deleteUserData: async (userId) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("No user logged in");

            // Delete user document and subcollections
            // Note: Cloud functions or recursive delete is cleaner, but for this scale
            // we will delete known subcollections manually or rely on Firestore security rules/triggers.
            // For client-side simple implementation:
            const userRef = db.collection('users').doc(userId);

            // Delete subcollections (readingProgress, stats, settings) - Firestore doesn't delete subcollections automatically
            // Doing a best-effort delete here.
            const stats = await userRef.collection('stats').get();
            stats.forEach(doc => doc.ref.delete());

            const progress = await userRef.collection('readingProgress').get();
            progress.forEach(doc => doc.ref.delete());

            const settings = await userRef.collection('settings').get();
            settings.forEach(doc => doc.ref.delete());

            // Delete main user doc
            await userRef.delete();

            // Delete Auth Account
            await user.delete();

        } catch (error) {
            console.error('Error deleting account:', error);
            throw error;
        }
    }
};
