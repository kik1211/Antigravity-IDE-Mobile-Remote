const CACHE_NAME = 'omni-antigravity-shell-v4';
const APP_SHELL = [
  '/',
  '/index.html',
  '/minimal.html',
  '/admin.html',
  '/manifest.json',
  '/css/style.css',
  '/css/variables.css',
  '/css/themes.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/chat.css',
  '/css/workspace.css',
  '/css/assist.css',
  '/js/app.js',
  '/js/admin.js',
  '/js/minimal.js',
  '/js/vendor/morphdom-lite.js',
  '/js/components/file-browser.js',
  '/js/components/terminal-view.js',
  '/js/components/git-panel.js',
  '/js/components/stats-panel.js',
  '/js/components/assist-panel.js',
  '/js/components/timeline-panel.js',
  '/icons/app-icon.svg',
  '/icons/app-icon-maskable.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isStaticAsset =
    url.origin === self.location.origin &&
    (
      url.pathname.startsWith('/css/') ||
      url.pathname.startsWith('/js/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname === '/' ||
      url.pathname.endsWith('.html') ||
      url.pathname === '/manifest.json'
    );

  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      });
    })
  );
});
