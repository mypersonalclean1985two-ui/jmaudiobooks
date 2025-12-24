// Premium Player Logic
let audioPlayer;
let currentBook = null;
let sleepTimerTimeout = null;
let chapters = [];
let bookmarks = [];
let activeTab = 'chapters';
let chapterItemsCache = null; // Declare early to prevent hoisting issues
let sessionSeconds = 0;
let lastStatsUpdate = Date.now();
let stats = { streak: 0, weekMinutes: 0, completedBooks: 0, lastPlayed: null };

// SVG Constants for UI Sync
const playSvg = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
const pauseSvg = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';

// Load preliminary stats
const savedStats = localStorage.getItem('stats');
if (savedStats) stats = JSON.parse(savedStats);

// Performance Cache: Trial Status (Default true to preserve gesture)
let cachedTrialStatus = localStorage.getItem('trial_active') !== 'false';

document.addEventListener('DOMContentLoaded', async () => {
    // Init Elements
    audioPlayer = document.getElementById('audio-player');

    // 1. IMMEDIATE PARAMS CHECK (FASTEST)
    const urlParams = new URLSearchParams(window.location.search);
    const audioUrl = urlParams.get('file');
    const title = urlParams.get('title');
    const bookId = urlParams.get('id');
    const coverUrl = urlParams.get('cover');
    const author = urlParams.get('author');

    // Resume Logic
    const savedReading = localStorage.getItem('currentlyReading');
    let startPosition = 0;
    if (savedReading) {
        const savedData = JSON.parse(savedReading);
        if (savedData.bookId === bookId) {
            startPosition = savedData.currentTime || 0;
        }
    }

    // 2. INITIALIZATION PREP
    let resumeTime = startPosition;

    // LISTENERS: Define before setting src to catch all events
    audioPlayer.addEventListener('loadedmetadata', () => {
        if (resumeTime > 0) {
            audioPlayer.currentTime = resumeTime;
            resumeTime = 0; // Only apply once
        }
        document.getElementById('total-time').textContent = formatTime(audioPlayer.duration);
        if (chapters.length === 1) chapters[0].duration = audioPlayer.duration;
        renderList();
    });

    // Global UI Sync: Always match Play button to actual audio state
    audioPlayer.addEventListener('playing', () => {
        const playIcon = document.getElementById('play-icon');
        const playBtn = document.getElementById('play-pause-btn');
        if (playIcon) playIcon.innerHTML = pauseSvg;
        if (playBtn) playBtn.classList.remove('paused');
    });

    audioPlayer.addEventListener('pause', () => {
        const playIcon = document.getElementById('play-icon');
        const playBtn = document.getElementById('play-pause-btn');
        if (playIcon) playIcon.innerHTML = playSvg;
        if (playBtn) playBtn.classList.add('paused');
    });

    if (audioUrl) {
        // OPTIMIZE: Faster CORS handling for streaming
        audioPlayer.crossOrigin = "anonymous";

        if (!audioUrl.startsWith('http') && !audioUrl.startsWith('audio/')) {
            const loadingText = document.getElementById('loading-text');
            if (loadingText) {
                loadingText.style.opacity = '1';
                loadingText.innerHTML = `<span class="buffer-spinner"></span> Resolving...`;
            }

            window.firebaseStorage.ref(audioUrl).getDownloadURL().then(url => {
                audioPlayer.src = url;
                audioPlayer.load(); // Explicit load triggers background buffer

                // On iOS, auto-play often fails. We rely on the user's first tap.
                // But we attempt it anyway for smoother desktop experience.
                audioPlayer.play().catch(e => console.warn("Auto-play blocked (expected on mobile):", e));

                if (loadingText) loadingText.style.opacity = '0';
            }).catch(err => {
                console.error("Failed to resolve storage URL", err);
                audioPlayer.src = 'audio/sample.mp3';
                audioPlayer.load();
                audioPlayer.play().catch(e => { });
            });
        } else {
            audioPlayer.src = audioUrl;
            audioPlayer.load();
            audioPlayer.play().catch(e => console.warn("Auto-play blocked:", e));
        }
    }

    // Set UI Info
    document.getElementById('book-title').textContent = title || 'Unknown Title';
    document.getElementById('book-author').textContent = author || 'Unknown Author';

    if (coverUrl) {
        document.getElementById('cover-image').src = coverUrl;
        const bgBlur = document.getElementById('bg-blur');
        if (bgBlur) bgBlur.style.backgroundImage = `url('${coverUrl}')`;
    }

    setupControls();
    updateChapterCount();

    // Don't set fallback chapters yet - wait for Firestore fetch to complete
    console.log("Player: Waiting for Firestore data before rendering chapters...");

    // Async Fetching
    if (bookId) {
        console.log("Player: Starting async fetch for bookId:", bookId);
        Promise.all([
            window.firebaseFirestore.collection('books').doc(bookId).get().then(doc => {
                console.log("Player: Firestore fetch complete. Doc exists:", doc.exists);
                if (doc.exists) {
                    currentBook = doc.data();
                    console.log("Player: Fetched book data:", currentBook);
                    console.log("Player: Book has chapters field:", !!currentBook.chapters);
                    console.log("Player: Chapters is array:", Array.isArray(currentBook.chapters));
                    console.log("Player: Chapters length:", currentBook.chapters?.length);

                    // Log raw chapter data for debugging
                    if (currentBook.chapters && currentBook.chapters.length > 0) {
                        console.log("Player: Raw chapters data:", JSON.stringify(currentBook.chapters.slice(0, 2), null, 2));
                    }

                    if (currentBook.chapters && Array.isArray(currentBook.chapters) && currentBook.chapters.length > 0) {
                        console.log(`Player: ✅ Found ${currentBook.chapters.length} chapters!`);
                        chapters = currentBook.chapters;
                        console.log("Player: Chapters array assigned. First chapter:", chapters[0]);
                        console.log("Player: Calling renderList() with", chapters.length, "chapters");
                        renderList();
                        updateChapterCount();
                    } else {
                        console.warn("Player: ⚠️ No chapters array found in Firestore. Using fallback.");
                        console.warn("Player: This book may need chapters imported from LibriVox.");
                        // Create a single chapter representing the whole book
                        chapters = [{
                            title: currentBook.title || "Full Audiobook",
                            start: 0,
                            duration: audioPlayer.duration || 0 // Will update on metadata load
                        }];
                        console.log("Player: Fallback chapter created:", chapters);
                        renderList();
                        updateChapterCount();
                    }
                } else {
                    console.error("Player: ❌ Book document does not exist in Firestore!", bookId);
                    // Ensure we still have a default chapter
                    chapters = [{ title: "Audiobook", start: 0, duration: 0 }];
                    renderList();
                    updateChapterCount();
                }
            }).catch(err => {
                console.error("Player: ❌ Error fetching book details:", err);
                console.error("Player: Error details:", err.message, err.stack);
                // Ensure we still have a default chapter
                chapters = [{ title: "Audiobook (Error Loading)", start: 0, duration: 0 }];
                renderList();
                updateChapterCount();
            }),
            window.currentUser ? loadProgress(bookId) : Promise.resolve(),
            window.currentUser ? loadBookmarks(bookId) : Promise.resolve(),
            isTrialActive(true) // Refresh cache in background
        ]).catch(e => {
            console.error("Player: ❌ Promise.all failed:", e);
            // Ensure we have fallback chapters if everything fails
            if (chapters.length === 0) {
                chapters = [{ title: "Audiobook (Loading Failed)", start: 0, duration: 0 }];
                renderList();
                updateChapterCount();
            }
        });
    } else {
        console.warn("Player: ⚠️ No bookId provided in URL parameters!");
        // Set fallback for no bookId case
        chapters = [{ title: "Audiobook", start: 0, duration: 0 }];
        renderList();
        updateChapterCount();
    }

    // Buffering event listeners - must be inside DOMContentLoaded where audioPlayer is defined
    if (audioPlayer) {
        audioPlayer.addEventListener('waiting', () => { isBuffering = true; handleBuffering(); });
        audioPlayer.addEventListener('playing', () => { isBuffering = false; handleBuffering(); });
        audioPlayer.addEventListener('canplay', () => { isBuffering = false; handleBuffering(); });
        audioPlayer.addEventListener('stalled', () => { isBuffering = true; handleBuffering(); });
        audioPlayer.addEventListener('progress', handleBuffering);
    }
});

function setupControls() {
    const playBtn = document.getElementById('play-pause-btn');
    const progressContainer = document.getElementById('progress-container');

    playBtn.addEventListener('click', () => {
        // PREVENTION: Don't redirect if auth is still initializing
        if (!window.authInitialized) {
            console.log("Playback blocked: Auth initializing...");
            return;
        }

        // If auth resolved and still no user, and we want to enforce login (optional)
        // For now, our demo mode allows guests to play, so we check currentUser inside isTrialActive

        // SYNC CHECK for Gesture Preservation
        if (!cachedTrialStatus) {
            const loadingText = document.getElementById('loading-text');
            if (loadingText) {
                loadingText.style.opacity = '1';
                loadingText.innerHTML = "Trial Expired. Please Subscribe to Play.";
                setTimeout(() => window.location.href = 'index.html', 3000);
            }
            return;
        }

        if (audioPlayer.paused) {
            audioPlayer.play().catch(e => console.warn("Direct play failed:", e));
        } else {
            audioPlayer.pause();
        }
    });

    document.getElementById('rewind-btn').addEventListener('click', () => {
        audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 15);
    });

    document.getElementById('forward-btn').addEventListener('click', () => {
        audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 15);
    });

    progressContainer.addEventListener('click', (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audioPlayer.currentTime = pos * audioPlayer.duration;
    });

    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', () => {
        saveProgress(true);
    });

    document.getElementById('speed-btn').addEventListener('click', () => openSheet('speed-sheet'));
    document.getElementById('sleep-btn').addEventListener('click', () => openSheet('sleep-sheet'));
    document.getElementById('overlay').addEventListener('click', closeSheets);
    document.getElementById('bookmark-btn').addEventListener('click', addBookmark);

    // Swipe Gestures
    let touchStartX = 0;
    let touchStartY = 0;
    document.body.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    });

    document.body.addEventListener('touchend', e => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
    });

    function handleSwipe(startX, startY, endX, endY) {
        const diffX = endX - startX;
        const diffY = endY - startY;
        // Relaxed thresholds: >60px swipe, <100px off-axis tolerance
        if (Math.abs(diffX) > 60 && Math.abs(diffY) < 100) {
            if (diffX > 0) {
                console.log("Swipe Back Detected");
                history.back();
            }
        } else if (Math.abs(diffY) > 60 && Math.abs(diffX) < 100) {
            if (diffY > 0) {
                console.log("Swipe Down Detected");
                window.location.href = 'index.html';
            }
        }
    }

    // Scrubbing (Drag Support)
    let isDragging = false;
    const startDrag = (e) => { isDragging = true; updateScrub(e); };
    const doDrag = (e) => { if (isDragging) updateScrub(e); };
    const endDrag = () => { isDragging = false; };
    const updateScrub = (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        audioPlayer.currentTime = pos * audioPlayer.duration;
    };

    progressContainer.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', endDrag);
    progressContainer.addEventListener('touchstart', startDrag);
    document.addEventListener('touchmove', doDrag);
    document.addEventListener('touchend', endDrag);
}

let isBuffering = false;
function handleBuffering() {
    const loadingText = document.getElementById('loading-text');
    const bufferBar = document.getElementById('buffer-bar');
    if (!audioPlayer.duration) return;

    let bufferPercent = 0;
    if (audioPlayer.buffered.length > 0) {
        let range = 0;
        for (let i = 0; i < audioPlayer.buffered.length; i++) {
            if (audioPlayer.currentTime >= audioPlayer.buffered.start(i) &&
                audioPlayer.currentTime <= audioPlayer.buffered.end(i)) {
                range = i;
                break;
            }
        }
        const end = audioPlayer.buffered.end(range);
        bufferPercent = Math.min(100, (end / audioPlayer.duration) * 100);
    }

    if (bufferBar) bufferBar.style.width = `${bufferPercent}%`;

    if (loadingText) {
        const isStalled = (isBuffering || (audioPlayer.readyState < 3 && !audioPlayer.paused && audioPlayer.currentTime > 0));
        if (isStalled) {
            loadingText.style.opacity = '1';
            loadingText.innerHTML = `<span class="buffer-spinner"></span> Buffering: ${Math.round(bufferPercent)}%`;
        } else if (audioPlayer.readyState >= 3) {
            loadingText.style.opacity = '0';
        }
    }
}

function updateProgress() {
    if (!audioPlayer || !audioPlayer.duration) return;

    const now = Date.now();
    const dt = (now - lastStatsUpdate) / 1000;
    if (dt > 0 && dt < 2 && !audioPlayer.paused) {
        sessionSeconds += dt;
    }
    lastStatsUpdate = now;

    const progressFill = document.getElementById('progress-fill');
    const currentTimeEl = document.getElementById('current-time');
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (currentTimeEl) currentTimeEl.textContent = formatTime(audioPlayer.currentTime);

    handleBuffering();
    updateActiveChapter();

    if (Math.floor(audioPlayer.currentTime) % 10 === 0) {
        // Debounce to once per second
        if (!window._lastSaveTime || Math.floor(audioPlayer.currentTime) !== window._lastSaveTime) {
            window._lastSaveTime = Math.floor(audioPlayer.currentTime);

            if (sessionSeconds >= 60) {
                const mins = Math.floor(sessionSeconds / 60);
                stats.weekMinutes += mins;
                sessionSeconds -= (mins * 60);
                localStorage.setItem('stats', JSON.stringify(stats));
            }
            saveProgress();
            const bookId = new URLSearchParams(window.location.search).get('id');
            if (bookId) {
                localStorage.setItem('currentlyReading', JSON.stringify({
                    bookId: bookId,
                    currentTime: audioPlayer.currentTime,
                    progress: Math.floor((audioPlayer.currentTime / audioPlayer.duration) * 100),
                    timestamp: Date.now()
                }));
            }
        }
    }
}


function updateChapterCount() {
    const chapterCount = document.getElementById('chapter-count');
    const bookmarkCount = document.getElementById('bookmark-count');
    console.log("Player: updateChapterCount called. Chapters:", chapters.length, "Bookmarks:", bookmarks.length);
    if (chapterCount) chapterCount.textContent = `(${chapters.length})`;
    if (bookmarkCount) bookmarkCount.textContent = `(${bookmarks.length})`;
}

function renderList() {
    const chapterContainer = document.getElementById('chapter-list');
    console.log("Player: renderList called for chapters. Container found:", !!chapterContainer, "Chapters:", chapters);
    if (chapterContainer) {
        chapterContainer.innerHTML = '';
        if (Array.isArray(chapters) && chapters.length > 0) {
            console.log("Player: Rendering", chapters.length, "chapters");
            chapters.forEach((chapter, index) => {
                const div = document.createElement('div');
                div.className = 'list-item chapter-item';
                div.innerHTML = `<div><div class="item-title">${chapter.title}</div><div class="item-sub">${formatTime(chapter.start)}</div></div>`;
                div.onclick = () => {
                    if (chapter.fileUrl) {
                        if (audioPlayer.src !== chapter.fileUrl) {
                            audioPlayer.src = chapter.fileUrl;
                            audioPlayer.load();
                        }
                    } else {
                        audioPlayer.currentTime = chapter.start;
                    }
                    audioPlayer.play();
                    document.querySelectorAll('.chapter-item').forEach(el => el.classList.remove('active'));
                    div.classList.add('active');
                };
                chapterContainer.appendChild(div);
            });
            console.log("Player: Chapters rendered successfully");
        } else {
            console.warn("renderList: Chapters is empty or not an array", chapters);
            chapterContainer.innerHTML = '<div style="padding:16px; color:#aaa; text-align:center">No chapters available</div>';
        }
        chapterItemsCache = null; // Invalidate cache
        updateActiveChapter();
    } else {
        console.error("Player: chapter-list container not found in DOM!");
    }

    const bookmarkContainer = document.getElementById('bookmark-list');
    console.log("Player: renderList called. Container found:", !!bookmarkContainer);
    if (bookmarkContainer) {
        bookmarkContainer.innerHTML = '';
        if (bookmarks.length === 0) {
            bookmarkContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-secondary);">No bookmarks yet</div>';
        } else {
            bookmarks.sort((a, b) => a.time - b.time).forEach(bm => {
                const div = document.createElement('div');
                div.className = 'list-item';
                div.innerHTML = `<div><div class="item-title">Bookmark at ${formatTime(bm.time)}</div><div class="item-sub">${new Date(bm.createdAt).toLocaleDateString()}</div></div><button onclick="deleteBookmark('${bm.id}', event)" style="background:none;border:none;color:#ef4444;">✕</button>`;
                div.onclick = (e) => {
                    if (e.target.closest('button')) return;
                    audioPlayer.currentTime = bm.time;
                    audioPlayer.play();
                };
                bookmarkContainer.appendChild(div);
            });
        }
    }
    updateChapterCount();
}

// chapterItemsCache now declared at top of file
function updateActiveChapter() {
    const time = audioPlayer.currentTime;
    if (!chapterItemsCache) chapterItemsCache = document.querySelectorAll('.chapter-item');
    const items = chapterItemsCache;

    chapters.forEach((ch, i) => {
        if (items[i]) {
            let isActive = false;
            if (ch.fileUrl) {
                const currentSrc = decodeURIComponent(audioPlayer.src);
                const chapterSrc = decodeURIComponent(ch.fileUrl);
                if (currentSrc.includes(chapterSrc) || chapterSrc.includes(currentSrc)) isActive = true;
            } else {
                if (time >= ch.start && time < (ch.start + ch.duration)) isActive = true;
            }
            if (isActive) items[i].classList.add('active');
            else items[i].classList.remove('active');
        }
    });
}

function openSheet(id) {
    document.getElementById('overlay').classList.add('active');
    document.getElementById(id).classList.add('open');
}

function closeSheets() {
    document.getElementById('overlay').classList.remove('active');
    document.querySelectorAll('.bottom-sheet').forEach(s => s.classList.remove('open'));
}

window.setSpeed = (speed) => {
    audioPlayer.playbackRate = speed;
    document.getElementById('speed-label').textContent = `${speed}x`;
    closeSheets();
    const btns = document.querySelectorAll('#speed-sheet .option-btn');
    btns.forEach(b => { b.classList.toggle('selected', b.textContent === `${speed}x`); });
};

window.setSleep = (min) => {
    if (sleepTimerTimeout) clearTimeout(sleepTimerTimeout);
    if (min > 0) {
        sleepTimerTimeout = setTimeout(() => { audioPlayer.pause(); }, min * 60 * 1000);
        document.getElementById('sleep-label').textContent = `${min}m`;
    } else {
        document.getElementById('sleep-label').textContent = 'Off';
    }
    closeSheets();
    const btns = document.querySelectorAll('#sleep-sheet .option-btn');
    btns.forEach(b => {
        const val = b.textContent.includes('Off') ? 0 : parseInt(b.textContent);
        b.classList.toggle('selected', val === min);
    });
};

async function loadProgress(bookId) {
    try {
        const doc = await window.firebaseFirestore.collection('users').doc(window.currentUser.uid).collection('progress').doc(bookId).get();
        if (doc.exists && doc.data().currentTime) {
            audioPlayer.currentTime = doc.data().currentTime;
        }
    } catch (e) { console.error(e); }
}

async function saveProgress(completed = false) {
    const bookId = new URLSearchParams(window.location.search).get('id');
    if (!bookId || !window.currentUser) return;
    try {
        await window.firebaseFirestore.collection('users').doc(window.currentUser.uid).collection('progress').doc(bookId).set({
            currentTime: audioPlayer.currentTime,
            duration: audioPlayer.duration,
            lastPlayed: new Date(),
            completed
        }, { merge: true });
        await window.firebaseFirestore.collection('users').doc(window.currentUser.uid).collection('stats').doc('current').set(stats, { merge: true });
    } catch (e) { console.error(e); }
}

async function addBookmark() {
    const bookId = new URLSearchParams(window.location.search).get('id');
    if (!bookId || !window.currentUser) {
        alert("Please sign in to bookmark!");
        return;
    }
    console.log("Player: addBookmark called for book", bookId);
    const bm = { id: Date.now().toString(), time: audioPlayer.currentTime, createdAt: new Date().toISOString() };
    bookmarks.push(bm);
    console.log("Player: Current bookmarks count:", bookmarks.length);
    renderList();

    // UI Feedback
    const btn = document.getElementById('bookmark-btn');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '✅';
    setTimeout(() => btn.innerHTML = originalContent, 2000);

    try {
        const db = window.firebaseDB;
        console.log("Player: Saving bookmark to Firestore for user", window.currentUser.uid);
        await db.collection('users').doc(window.currentUser.uid).set({
            library: window.firebase.firestore.FieldValue.arrayUnion(bookId),
            lastUpdated: window.firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        await db.collection('users').doc(window.currentUser.uid).collection('bookmarks').doc(bookId).set({
            items: bookmarks,
            lastUpdated: window.firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log("Player: Bookmark saved and book added to library successfully.");
    } catch (e) {
        console.error("CRITICAL Bookmarking Error:", e);
        btn.innerHTML = '❌';
        setTimeout(() => btn.innerHTML = originalContent, 2000);
    }
}

async function loadBookmarks(bookId) {
    try {
        const doc = await window.firebaseFirestore.collection('users').doc(window.currentUser.uid).collection('bookmarks').doc(bookId).get();
        if (doc.exists) { bookmarks = doc.data().items || []; renderList(); }
    } catch (e) { console.error(e); }
}

window.deleteBookmark = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete bookmark?')) return;
    bookmarks = bookmarks.filter(b => b.id !== id);
    renderList();
    const bookId = new URLSearchParams(window.location.search).get('id');
    if (bookId) { await window.firebaseFirestore.collection('users').doc(window.currentUser.uid).collection('bookmarks').doc(bookId).set({ items: bookmarks }); }
};

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}:${(m % 60).toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

async function isTrialActive(forceRefresh = false) {
    // REFINED LOGIC: Align with app.js
    if (!window.currentUser) return true; // Guests get demo access
    if (window.globalUserProfile && window.globalUserProfile.isGuest) return true;

    if (!forceRefresh && cachedTrialStatus === true) return true;
    try {
        const doc = await window.firebaseFirestore.collection('users').doc(window.currentUser.uid).get();
        if (!doc.exists) return true; // Permissive for new accounts
        const data = doc.data();
        let active = true;
        if (data.trialStartDate) {
            const start = data.trialStartDate.toDate ? data.trialStartDate.toDate() : new Date(data.trialStartDate);
            active = Math.ceil((new Date() - start) / (1000 * 60 * 60 * 24)) <= 14;
        }
        cachedTrialStatus = active;
        localStorage.setItem('trial_active', active.toString());

        // If it was true but now found to be false, stop playback
        if (!active && !audioPlayer.paused) {
            audioPlayer.pause();
            const loadingText = document.getElementById('loading-text');
            if (loadingText) {
                loadingText.style.opacity = '1';
                loadingText.innerHTML = "Trial Expired. Please Subscribe to Play.";
                setTimeout(() => window.location.href = 'index.html', 3000);
            }
        }
        return active;
    } catch (e) { console.error("Trial check failed:", e); return true; }
}
