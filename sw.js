const CACHE = 'socialog-v5';

// Relative paths resolve correctly whether the app is at the root or a subpath
// (e.g. GitHub Pages at /socialog/). Absolute paths like '/index.html' would
// resolve to the domain root and 404 on project-page deployments.
const LOCAL = [
  './',
  './index.html',
  './utils.js',
  './toast.jsx',
  './bottom-sheet.jsx',
  './tweaks-panel.jsx',
  './Bookmarks.jsx',
  './Todos.jsx',
  './Routines.jsx',
  './Home.jsx',
  './Profile.jsx',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

const CDN = [
  'https://unpkg.com/react@18.3.1/umd/react.development.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // Precache local files strictly; CDN files best-effort
      c.addAll(LOCAL).then(() =>
        Promise.allSettled(CDN.map(url => c.add(new Request(url, { mode: 'cors' }))))
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // Cache successful responses for future offline use
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
