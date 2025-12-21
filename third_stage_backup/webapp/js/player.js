// Premium Player Logic
let audioPlayer;
let currentBook = null;
let sleepTimerTimeout = null;
let chapters = [];
let bookmarks = [];
let activeTab = 'chapters';

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

    // SVG Paths
    const playSvg = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
    const pauseSvg = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';

    playBtn.addEventListener('click', () => {
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
    const progressContainer = document.getElementById('progress-container');
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
}

function updateProgress() {
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('current-time').textContent = formatTime(audioPlayer.currentTime);

    // Update active chapter in list
    updateActiveChapter();

    // Auto-save
    if (Math.floor(audioPlayer.currentTime) % 10 === 0) saveProgress();
}

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
        await window.firebaseFirestore.collection('users')
            .doc(window.currentUser.uid).collection('bookmarks').doc(bookId)
            .set({ items: bookmarks }, { merge: true });
    } catch (e) { console.error(e); }
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
