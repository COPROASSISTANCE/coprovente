/* Service worker : l'application fonctionne hors ligne une fois chargée. */
const CACHE = 'coprovente-v3';
const SHELL = ['./', 'index.html', 'app.css', 'config.js', 'data.js', 'store.js', 'app.js', 'docs.js', 'pages.js', 'icon.svg', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.origin === location.origin) {
    // Réseau d'abord (mises à jour), cache en secours (hors ligne)
    e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
  } else if (u.hostname === 'cdnjs.cloudflare.com') {
    e.respondWith(caches.match(e.request).then(m => m || fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; })));
  }
});
