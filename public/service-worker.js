const CACHE_NAME = 'pos-app-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
];

// Helper to check if URL should be cached
const shouldCache = (url) => {
  // Don't cache chrome-extension URLs
  if (url.startsWith('chrome-extension://')) return false;
  
  // Don't cache other origins
  const self_url = new URL(self.location.origin);
  const target_url = new URL(url);
  if (self_url.origin !== target_url.origin) return false;

  return true;
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.warn('Cache installation failed:', error);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Don't handle chrome-extension requests
  if (!shouldCache(event.request.url)) return;

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Try to cache the response
          caches.open(CACHE_NAME)
            .then((cache) => {
              if (shouldCache(event.request.url)) {
                cache.put(event.request, responseToCache)
                  .catch(error => {
                    console.warn('Cache put failed:', error);
                  });
              }
            })
            .catch(error => {
              console.warn('Cache open failed:', error);
            });

          return response;
        });
      })
      .catch(error => {
        console.warn('Fetch handler failed:', error);
        // Return a fallback response or rethrow
        throw error;
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 