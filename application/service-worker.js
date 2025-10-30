const CACHE_NAME = 'e-commerce-v1';

const urlsToCache = [
    '/',
    '/index.html',
    '/shopper.html',
    '/business.html',
    '/offline.html',
    '/css/styles.css',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Service Worker: Installed successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker: Installation failed', error);
            })
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated successfully');
                return self.clients.claim();
            })
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') {
        return;
    }

    if (!request.url.startsWith(self.location.origin)) {
        return;
    }

    if (url.pathname.startsWith('/js/')) {
        return;
    }

    if (request.url.includes('firebasestorage.googleapis.com') ||
        request.url.includes('firebaseio.com') ||
        request.url.includes('googleapis.com') ||
        request.url.includes('gstatic.com') ||
        request.url.includes('firebase')) {
        return;
    }

    if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') {
        return;
    }

    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    fetch(request)
                        .then((networkResponse) => {
                            if (networkResponse && networkResponse.status === 200) {
                                caches.open(CACHE_NAME)
                                    .then((cache) => {
                                        cache.put(request, networkResponse.clone());
                                    });
                            }
                        })
                        .catch(() => {});

                    return cachedResponse;
                }

                return fetch(request)
                    .then((networkResponse) => {
                        if (!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }

                        if (networkResponse.type === 'basic' || networkResponse.type === 'cors') {
                            const responseToCache = networkResponse.clone();

                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(request, responseToCache);
                                })
                                .catch(() => {});
                        }

                        return networkResponse;
                    })
                    .catch((error) => {
                        console.log('Fetch failed for:', request.url, error);

                        if (request.destination === 'document') {
                            return caches.match('/offline.html');
                        }

                        return new Response('Network error', {
                            status: 408,
                            headers: { 'Content-Type': 'text/plain' }
                        });
                    });
            })
            .catch((error) => {
                console.error('Cache match failed:', error);
                return fetch(request);
            })
    );
});
