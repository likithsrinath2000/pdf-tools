/**
 * Service Worker for PDFTools App
 * 
 * Caching Strategy:
 * - Static assets (CSS, JS, fonts, images): Cache-first strategy
 *   Assets are served from cache first, falling back to network. This provides
 *   fast load times for repeat visits.
 * 
 * - API calls (/api/*): Network-first strategy
 *   Always try network first to get fresh data, fall back to cache for offline support.
 * 
 * - Offline fallback: Returns cached offline page when network is unavailable
 */

const CACHE_NAME = 'pdftools-cache-v1';
const STATIC_CACHE_NAME = 'pdftools-static-v1';
const API_CACHE_NAME = 'pdftools-api-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.png'
];

const STATIC_EXTENSIONS = ['.js', '.css', '.woff', '.woff2', '.ttf', '.otf', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('pdftools-') && 
                   name !== CACHE_NAME && 
                   name !== STATIC_CACHE_NAME && 
                   name !== API_CACHE_NAME;
          })
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

function isStaticAsset(url) {
  const pathname = new URL(url).pathname;
  return STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext)) ||
         pathname.startsWith('/assets/');
}

function isApiCall(url) {
  const pathname = new URL(url).pathname;
  return pathname.startsWith('/api/');
}

async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'Network unavailable' }),
      { 
        status: 503, 
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  if (request.method !== 'GET') {
    return;
  }

  if (isApiCall(request.url)) {
    event.respondWith(networkFirstStrategy(request));
  } else if (isStaticAsset(request.url)) {
    event.respondWith(cacheFirstStrategy(request));
  } else {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request);
      })
    );
  }
});
