// Premium Player Logic
let audioPlayer;
let currentBook = null;
let sleepTimerTimeout = null;
let chapters = [];
let bookmarks = [];
let activeTab = 'chapters';
let sessionSeconds = 0;
let lastStatsUpdate = Date.now();
let stats = { streak: 0, weekMinutes: 0, completedBooks: 0, lastPlayed: null };

// Load preliminary stats
const savedStats = localStorage.getItem('stats');
if (savedStats) stats = JSON.parse(savedStats);

// Mock Data
const mockChapters = [
    { title: "Chapter 1: The Beginning", start: 0, duration: 60 },
    { title: "Chapter 2: The Journey", start: 60, duration: 120 },
    { title: "Chapter 3: The Conflict", start: 180, duration: 90 },
    { title: "Chapter 4: The Resolution", start: 270, duration: 60 },
    { title: "Chapter 5: Epilogue", start: 330, duration: 45 }
];

document.addEventListener('DOMContentLoaded', async () => {
    // Init Elements
    audioPlayer = document.getElementById('audio-player');

    // Resume Logic: Load saved state from LocalStorage for seamless transition
    // This handles the "Resume" button from Home
    const savedReading = localStorage.getItem('currentlyReading');
    let startPosition = 0;
    if (savedReading) {
        const savedData = JSON.parse(savedReading);
        // Check if this player instance matches the saved book
        const currentBookId = new URLSearchParams(window.location.search).get('id');
        if (savedData.bookId === currentBookId) {
            console.log("Resuming from saved position:", savedData.currentTime);
            startPosition = savedData.currentTime || 0;
        }
    }

    // Get Params
    const urlParams = new URLSearchParams(window.location.search);
    const audioUrl = urlParams.get('file');
    const title = urlParams.get('title');
    const bookId = urlParams.get('id');
    const coverUrl = urlParams.get('cover');
    const author = urlParams.get('author');

    // Set UI Info
    document.getElementById('book-title').textContent = title || 'Unknown Title';
    document.getElementById('book-author').textContent = author || 'Unknown Author';

    if (coverUrl) {
        document.getElementById('cover-image').src = coverUrl;
        document.getElementById('bg-blur').style.backgroundImage = `url('${coverUrl}')`;
    }

    // Set Audio Source
    if (audioUrl) {
        audioPlayer.src = audioUrl;
        audioPlayer.currentTime = startPosition; // Resume position
    } else {
        alert('No audio file found');
    }

    // Load Chapters
    // Load Chapters
    if (title && (title.includes("Sample") || title.includes("Test"))) {
        chapters = mockChapters;
    } else if (window.currentBook && window.currentBook.chapters && window.currentBook.chapters.length > 0) {
        chapters = window.currentBook.chapters;
    } else {
        chapters = [{ title: "Part 1", start: 0, duration: audioPlayer.duration || 0 }];
    }

    // Setup UI
    setupControls();
    renderList();
    updateChapterCount();

    // Load User Data & Book Details
    if (bookId) {
        try {
            // Fetch full book details to get chapters
            const doc = await window.firebase.firestore().collection('books').doc(bookId).get();
            if (doc.exists) {
                window.currentBook = doc.data();
                // Re-evaluate chapters with the fetched data
                if (window.currentBook.chapters && window.currentBook.chapters.length > 0) {
                    chapters = window.currentBook.chapters;
                    renderList(); // Re-render list with chapters
                }
            }
        } catch (e) {
            console.error("Error fetching book details:", e);
        }

        if (window.currentUser) {
            await loadProgress(bookId);
            await loadBookmarks(bookId);
        }
    }
});

function setupControls() {
    // Play/Pause
    // Play/Pause
    const playBtn = document.getElementById('play-pause-btn');
    const playIcon = document.getElementById('play-icon');
    const progressFill = document.getElementById('progress-fill');
    const currentTimeEl = document.getElementById('current-time');
    const progressContainer = document.getElementById('progress-container');
    const playSvg = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
    const pauseSvg = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';

    playBtn.addEventListener('click', async () => {
        // TRIAL CHECK
        if (!window.currentUser) {
            window.location.href = 'index.html';
            return;
        }

        const active = await isTrialActive();
        if (!active) {
            alert("Your 14-day free trial has expired. Redirecting to subscription page...");
            window.location.href = 'index.html';
            return;
        }

        if (audioPlayer.paused) {
            audioPlayer.play();
            playIcon.innerHTML = pauseSvg;
            playBtn.classList.remove('paused');
        } else {
            audioPlayer.pause();
            playIcon.innerHTML = playSvg;
            playBtn.classList.add('paused');
        }
    });

    // Skip Buttons
    document.getElementById('rewind-btn').addEventListener('click', () => {
        audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 15);
    });

    document.getElementById('forward-btn').addEventListener('click', () => {
        audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 15);
    });

    // Progress Bar (Click & Drag)
    progressContainer.addEventListener('click', (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audioPlayer.currentTime = pos * audioPlayer.duration;
    });

    // Audio Events
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('loadedmetadata', () => {
        document.getElementById('total-time').textContent = formatTime(audioPlayer.duration);
        if (chapters.length === 1) chapters[0].duration = audioPlayer.duration;
        renderList();
    });
    audioPlayer.addEventListener('ended', () => {
        playIcon.innerHTML = playSvg;
        saveProgress(true);
    });

    // Modals
    document.getElementById('speed-btn').addEventListener('click', () => openSheet('speed-sheet'));
    document.getElementById('sleep-btn').addEventListener('click', () => openSheet('sleep-sheet'));
    document.getElementById('overlay').addEventListener('click', closeSheets);

    // Bookmark
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

        // Thresholds
        if (Math.abs(diffX) > 100 && Math.abs(diffY) < 50) {
            // Horizontal Swipe
            if (diffX > 0) {
                // Swipe Right (Go Back)
                history.back();
            }
        } else if (Math.abs(diffY) > 100 && Math.abs(diffX) < 50) {
            // Vertical Swipe
            if (diffY > 0) {
                // Swipe Down (Close/Minimize)
                window.location.href = 'index.html';
            }
        }
    }

    // Improved Scrubbing (Drag Support)
    let isDragging = false;

    const startDrag = (e) => {
        isDragging = true;
        updateScrub(e);
    };

    const doDrag = (e) => {
        if (isDragging) updateScrub(e);
    };

    const endDrag = () => {
        if (isDragging) {
            isDragging = false;
            // Resume playing if it was playing, or just commit the time
        }
    };

    const updateScrub = (e) => {
        const rect = progressContainer.getBoundingClientRect();
        // Support touch and mouse
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

// Buffering State Tracking
let isBuffering = false;

function handleBuffering() {
    const loadingText = document.getElementById('loading-text');
    const bufferBar = document.getElementById('buffer-bar');

    if (!audioPlayer.duration) return;

    // 1. Update Buffer Bar
    let bufferPercent = 0;
    if (audioPlayer.buffered.length > 0) {
        // Find the range containing currentTime, or the closest one before it
        let range = 0;
        for (let i = 0; i < audioPlayer.buffered.length; i++) {
            if (audioPlayer.currentTime >= audioPlayer.buffered.start(i) &&
                audioPlayer.currentTime <= audioPlayer.buffered.end(i)) {
                range = i;
                break;
            }
            if (audioPlayer.buffered.end(i) > audioPlayer.buffered.end(range) &&
                audioPlayer.buffered.start(i) <= audioPlayer.currentTime) {
                range = i;
            }
        }
        const end = audioPlayer.buffered.end(range);
        bufferPercent = Math.min(100, (end / audioPlayer.duration) * 100);
    }

    if (bufferBar) {
        bufferBar.style.width = `${bufferPercent}%`;
    }

    // 2. Update Loading Text & Spinner
    if (loadingText) {
        // Show if explicitly buffering OR if audio is stalled (paused but not by user, or readyState low)
        const isStalled = (isBuffering || (audioPlayer.readyState < 3 && !audioPlayer.paused && audioPlayer.currentTime > 0));

        if (isStalled) {
            if (loadingText.style.opacity !== '1') {
                loadingText.style.opacity = '1';
            }
            loadingText.innerHTML = `<span class="buffer-spinner"></span> Buffering: ${Math.round(bufferPercent)}%`;
        } else {
            if (loadingText.style.opacity !== '0') {
                loadingText.style.opacity = '0';
            }
        }
    }
}

function updateProgress() {
    if (!audioPlayer) return;
    if (!audioPlayer.duration) return;

    // sessionSeconds tracking
    const now = Date.now();
    const dt = (now - lastStatsUpdate) / 1000;
    if (dt > 0 && dt < 2 && !audioPlayer.paused) {
        sessionSeconds += dt;
        if (Math.floor(audioPlayer.currentTime) % 5 === 0) console.log("Player Progress:", audioPlayer.currentTime);
    }
    lastStatsUpdate = now;

    // Playback Progress
    const progressFill = document.getElementById('progress-fill');
    const currentTimeEl = document.getElementById('current-time');

    const progress = audioPlayer.duration ? (audioPlayer.currentTime / audioPlayer.duration) * 100 : 0;
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (currentTimeEl) currentTimeEl.textContent = formatTime(audioPlayer.currentTime);

    // Update Buffer Bar during normal playback
    handleBuffering();

    // Update active chapter in list
    updateActiveChapter();

    // Auto-save & Local Sync
    if (Math.floor(audioPlayer.currentTime) % 10 === 0) {
        // Update local stats from sessionSeconds
        if (sessionSeconds >= 60) {
            const mins = Math.floor(sessionSeconds / 60);
            stats.weekMinutes += mins;
            sessionSeconds -= (mins * 60);
            localStorage.setItem('stats', JSON.stringify(stats));
        }

        saveProgress();
        const bookId = new URLSearchParams(window.location.search).get('id');
        if (bookId) {
            const progressData = {
                bookId: bookId,
                currentTime: audioPlayer.currentTime,
                progress: Math.floor((audioPlayer.currentTime / audioPlayer.duration) * 100),
                timestamp: Date.now()
            };
            localStorage.setItem('currentlyReading', JSON.stringify(progressData));
        }
    }
}

// Add New Listeners for Buffering
audioPlayer.addEventListener('waiting', () => {
    isBuffering = true;
    handleBuffering();
});

audioPlayer.addEventListener('playing', () => {
    isBuffering = false;
    handleBuffering();
});

audioPlayer.addEventListener('canplay', () => {
    isBuffering = false;
    handleBuffering();
});

audioPlayer.addEventListener('stalled', () => {
    isBuffering = true;
    handleBuffering();
});

audioPlayer.addEventListener('progress', handleBuffering);

// Removed setupTabs - no longer needed with collapsible panels
// Panels toggle independently now

function updateChapterCount() {
    const chapterCount = document.getElementById('chapter-count');
    const bookmarkCount = document.getElementById('bookmark-count');
    if (chapterCount) chapterCount.textContent = `(${chapters.length})`;
    if (bookmarkCount) bookmarkCount.textContent = `(${bookmarks.length})`;
}

function renderList() {
    // Render chapters in chapter-list
    const chapterContainer = document.getElementById('chapter-list');
    if (chapterContainer) {
        chapterContainer.innerHTML = '';
        chapters.forEach((chapter, index) => {
            const div = document.createElement('div');
            div.className = 'list-item chapter-item';
            div.innerHTML = `
                <div>
                    <div class="item-title">${chapter.title}</div>
                    <div class="item-sub">${formatTime(chapter.start)}</div>
                </div>
            `;
            div.onclick = () => {
                if (chapter.fileUrl) {
                    // Multi-file chapter support
                    if (audioPlayer.src !== chapter.fileUrl) {
                        audioPlayer.src = chapter.fileUrl;
                        audioPlayer.load();
                    }
                    audioPlayer.currentTime = 0;
                } else {
                    // Single-file timestamp support
                    audioPlayer.currentTime = chapter.start;
                }
                audioPlayer.play();

                // Update Play Icon
                const playIcon = document.getElementById('play-icon');
                if (playIcon) {
                    playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
                }
                document.getElementById('play-pause-btn').classList.remove('paused');

                // Update active state immediately
                document.querySelectorAll('.chapter-item').forEach(el => el.classList.remove('active'));
                div.classList.add('active');
            };
            chapterContainer.appendChild(div);
        });
        updateActiveChapter();
    }

    // Render bookmarks in bookmark-list
    const bookmarkContainer = document.getElementById('bookmark-list');
    if (bookmarkContainer) {
        bookmarkContainer.innerHTML = '';
        if (bookmarks.length === 0) {
            bookmarkContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-secondary);">No bookmarks yet</div>';
        } else {
            bookmarks.sort((a, b) => a.time - b.time).forEach(bm => {
                const div = document.createElement('div');
                div.className = 'list-item';
                div.innerHTML = `
                    <div>
                        <div class="item-title">Bookmark at ${formatTime(bm.time)}</div>
                        <div class="item-sub">${new Date(bm.createdAt).toLocaleDateString()}</div>
                    </div>
                    <button onclick="deleteBookmark('${bm.id}', event)" style="background:none;border:none;color:#ef4444;">
                        ✕
                    </button>
                `;
                div.onclick = (e) => {
                    if (e.target.closest('button')) return;
                    audioPlayer.currentTime = bm.time;
                    audioPlayer.play();
                };
                bookmarkContainer.appendChild(div);
            });
        }
    }

    // Update counts
    updateChapterCount();
}

function updateActiveChapter() {
    const time = audioPlayer.currentTime;
    const items = document.querySelectorAll('.chapter-item');

    chapters.forEach((ch, i) => {
        if (items[i]) {
            let isActive = false;

            if (ch.fileUrl) {
                // Multi-file: check if src matches (normalize both)
                const currentSrc = decodeURIComponent(audioPlayer.src);
                const chapterSrc = decodeURIComponent(ch.fileUrl);

                if (currentSrc.includes(chapterSrc) || chapterSrc.includes(currentSrc)) {
                    isActive = true;
                }
            } else {
                // Single-file: check timestamp
                if (time >= ch.start && time < (ch.start + ch.duration)) {
                    isActive = true;
                }
            }

            if (isActive) {
                items[i].classList.add('active');
            } else {
                items[i].classList.remove('active');
            }
        }
    });
}

// Sheets & Modals
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

    // Update UI selection
    const btns = document.querySelectorAll('#speed-sheet .option-btn');
    btns.forEach(b => {
        b.classList.toggle('selected', b.textContent === `${speed}x`);
    });
};

window.setSleep = (min) => {
    if (sleepTimerTimeout) clearTimeout(sleepTimerTimeout);

    if (min > 0) {
        sleepTimerTimeout = setTimeout(() => {
            audioPlayer.pause();
            document.getElementById('play-icon').name = 'play';
        }, min * 60 * 1000);
        document.getElementById('sleep-label').textContent = `${min}m`;
    } else {
        document.getElementById('sleep-label').textContent = 'Off';
    }
    closeSheets();

    // Update UI
    const btns = document.querySelectorAll('#sleep-sheet .option-btn');
    btns.forEach(b => {
        const val = b.textContent.includes('Off') ? 0 : parseInt(b.textContent);
        b.classList.toggle('selected', val === min);
    });
};

// Data Persistence
async function loadProgress(bookId) {
    try {
        const doc = await window.firebaseFirestore.collection('users')
            .doc(window.currentUser.uid).collection('progress').doc(bookId).get();
        if (doc.exists && doc.data().currentTime) {
            audioPlayer.currentTime = doc.data().currentTime;
        }
    } catch (e) { console.error(e); }
}

async function saveProgress(completed = false) {
    const bookId = new URLSearchParams(window.location.search).get('id');
    if (!bookId || !window.currentUser) return;

    try {
        await window.firebaseFirestore.collection('users')
            .doc(window.currentUser.uid).collection('progress').doc(bookId).set({
                currentTime: audioPlayer.currentTime,
                duration: audioPlayer.duration,
                lastPlayed: new Date(),
                completed
            }, { merge: true });

        // Update Stats in Firestore
        await window.firebaseFirestore.collection('users')
            .doc(window.currentUser.uid).collection('stats').doc('current')
            .set(stats, { merge: true });

    } catch (e) { console.error(e); }
}

async function addBookmark() {
    const bookId = new URLSearchParams(window.location.search).get('id');
    if (!bookId || !window.currentUser) return;

    const bm = {
        id: Date.now().toString(),
        time: audioPlayer.currentTime,
        createdAt: new Date().toISOString()
    };
    bookmarks.push(bm);
    renderList();

    try {
        // 1. Primary: Add to "library" array in User Document (HIGH RELIABILITY)
        try {
            await window.firebaseFirestore.collection('users')
                .doc(window.currentUser.uid).set({
                    library: firebase.firestore.FieldValue.arrayUnion(bookId),
                    lastUpdated: new Date()
                }, { merge: true });
            console.log("Library Sync: Successfully updated User Doc field.");
        } catch (docErr) {
            console.error("Library Sync: Failed to update User Doc field!", docErr);
        }

        // 2. Secondary: Update Bookmarks Subcollection
        try {
            await window.firebaseFirestore.collection('users')
                .doc(window.currentUser.uid).collection('bookmarks').doc(bookId)
                .set({ items: bookmarks, lastUpdated: new Date() }, { merge: true });
            console.log("Library Sync: Successfully updated bookmarks subcollection.");
        } catch (bmErr) {
            console.warn("Library Sync: Bookmarks subcollection blocked.");
        }

        // 3. Optional: Legacy Library Subcollection
        try {
            await window.firebaseFirestore.collection('users')
                .doc(window.currentUser.uid).collection('library').doc(bookId).set({
                    addedAt: new Date(),
                    title: book.title
                }, { merge: true });
            console.log("Library Sync: Successfully updated legacy library subcollection.");
        } catch (subErr) {
            console.warn("Library Sync: Legacy library subcollection blocked.");
        }
    } catch (e) {
        console.error("CRITICAL Bookmarking Error:", e);
    }
}

async function loadBookmarks(bookId) {
    try {
        const doc = await window.firebaseFirestore.collection('users')
            .doc(window.currentUser.uid).collection('bookmarks').doc(bookId).get();
        if (doc.exists) {
            bookmarks = doc.data().items || [];
            renderList();
        }
    } catch (e) { console.error(e); }
}

window.deleteBookmark = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete bookmark?')) return;
    bookmarks = bookmarks.filter(b => b.id !== id);
    renderList();

    const bookId = new URLSearchParams(window.location.search).get('id');
    if (bookId) {
        await window.firebaseFirestore.collection('users')
            .doc(window.currentUser.uid).collection('bookmarks').doc(bookId)
            .set({ items: bookmarks });
    }
};

// Utils
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}:${(m % 60).toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// Trial & Subscription Helper
async function isTrialActive() {
    if (!window.currentUser) return false;

    try {
        const doc = await window.firebaseFirestore.collection('users').doc(window.currentUser.uid).get();
        if (!doc.exists) return false;

        const data = doc.data();
        if (!data.trialStartDate) return true; // Failsafe

        const start = data.trialStartDate.toDate ? data.trialStartDate.toDate() : new Date(data.trialStartDate);
        const now = new Date();
        const diffDays = Math.ceil((now - start) / (1000 * 60 * 60 * 24));

        return diffDays <= 14;
    } catch (e) {
        console.error("Trial check failed:", e);
        return true; // Allow playback if check fails to avoid blocking users
    }
}
