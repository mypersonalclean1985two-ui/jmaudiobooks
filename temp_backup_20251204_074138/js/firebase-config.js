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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Set session persistence to LOCAL (default, but explicit)
// In incognito/private mode, this will use sessionStorage instead
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((error) => {
        console.error('Error setting persistence:', error);
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
                // Use the user object directly, but prioritize the passed displayName if available (though it might not be updated yet in the user object)
                // Better to just set what we have and let the profile update handle the rest if needed.
                // Actually, for sign up, we update profile *before* this listener might fully process, but to be safe:
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
            await auth.signInWithPopup(provider);
        } catch (error) {
            console.error('Error signing in with Google:', error);
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

            // Grant 7-Day Free Trial
            console.log("[SIGNUP] Granting 7-day free trial...");
            const now = new Date();
            const trialExpiry = new Date();
            trialExpiry.setDate(now.getDate() + 7);

            try {
                await db.collection('users').doc(result.user.uid).collection('subscription').doc('current').set({
                    status: 'active',
                    plan: 'trial',
                    expiry: trialExpiry,
                    purchasedAt: now,
                    hasHadTrial: true,
                    isTrial: true,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log("[SIGNUP] Free trial granted successfully!");
            } catch (trialError) {
                console.error("[SIGNUP] Failed to grant free trial:", trialError);
                // Continue anyway - user is created, they just won't have trial
            }

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
            const snapshot = await db.collection('books').get({ source: 'server' });
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
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
    getUserSubscription: async (userId) => {
        try {
            const doc = await db.collection('users').doc(userId)
                .collection('subscription').doc('current').get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('Error getting subscription:', error);
            return null;
        }
    },
    updateUserSubscription: async (userId, subscriptionData) => {
        try {
            await db.collection('users').doc(userId)
                .collection('subscription').doc('current').set({
                    ...subscriptionData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
        } catch (error) {
            console.error('Error updating subscription:', error);
            throw error;
        }
    }
};
