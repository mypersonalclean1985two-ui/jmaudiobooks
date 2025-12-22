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
    alert("System Error: Firebase SDK could not be loaded locally. This usually means the app files are corrupted or the internal server is blocked. Please try restarting the app.");
    // Stop execution here or provide fallbacks
} else {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("Firebase: Initialization successful.");
        }
    } catch (e) {
        console.error("Firebase: Initialization failed!", e);
        alert("Firebase Init Error: " + e.message);
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

        // Initialize user document if it doesn't exist
        db.collection('users').doc(user.uid).get().then((doc) => {
            if (!doc.exists) {
                const userData = {
                    email: user.email,
                    displayName: user.displayName || 'Guest User',
                    photoURL: user.photoURL || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                db.collection('users').doc(user.uid).set(userData).then(() => {
                    // Initialize stats
                    db.collection('users').doc(user.uid).collection('stats').doc('current').set({
                        streak: 0,
                        weekMinutes: 0,
                        completedBooks: 0,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
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
            alert("Diagnostic: Google Login Error - " + error.message);
            throw error;
        }
    },
    signInWithApple: async () => {
        const provider = new firebase.auth.OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');
        try {
            await auth.signInWithRedirect(provider);
        } catch (error) {
            console.error('Error signing in with Apple:', error);
            alert("Diagnostic: Apple Login Error - " + error.message);
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
    getBooks: async () => {
        try {
            console.log("getBooks: Fetching from Firestore...");
            if (window.Capacitor) alert("Diagnostic: Requesting bookshelf from Firestore...");
            // Use default source (cache then server) for better mobile reliability
            const snapshot = await db.collection('books').get();
            console.log(`getBooks: Successfully fetched ${snapshot.docs.length} books.`);
            if (window.Capacitor) alert(`Diagnostic: Successfully loaded ${snapshot.docs.length} books.`);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting books:', error);
            alert("Diagnostic: Error fetching books - " + error.message);
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
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
        } catch (error) {
            console.error('Error updating settings:', error);
            throw error;
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
