const CACHE_NAME = 'jm-books-v3';
const ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/subscription.css',
    '/js/app.js',
    '/js/firebase-config.js',
    '/js/category-utils.js',
    '/js/category-enhance.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-storage-compat.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // CRITICAL PERF: Bypass Service Worker for Audio & Storage
    // Large binary streams should be handled natively by the browser's engine.
    if (
        url.pathname.endsWith('.mp3') ||
        url.pathname.endsWith('.m4a') ||
        url.hostname.includes('firebasestorage')
    ) {
        return; // Let the browser handle it directly
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});
