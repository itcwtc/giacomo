const CACHE_NAME = 'giacomo-emergency-v1';
const ASSETS = [
    '/',
    '/status.html',
    '/style.css',
    '/js/status.js',
    '/js/supabaseClient.js',
    '/manifest.json'
];

// INSTALL SERVICE WORKER AND CACHE STATIC ASSETS
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// NETWORK-FIRST CACHING STRATEGY FOR LIVE DATABASE FETCH
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});