const CACHE_NAME = 'pidanvoca-aa580776edcee864';
const CORE_URLS = ["./index.html","./assets/app.6d4a3089733c.js","./assets/app.b61f239c9925.css","./assets/import-worker.8dce9a18557a.js","./assets/playful-cloud-left.7490b74e4897.png","./assets/playful-cloud-right.a9727051d676.png","./assets/playful-sun.4537fff59846.svg","./data/books.manifest.json","./data/books/cet-4-vocabulary.json"];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_URLS)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('pidanvoca-') && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
    return response;
  })));
});
