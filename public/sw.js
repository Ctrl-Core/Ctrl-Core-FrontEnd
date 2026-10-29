/* Service Worker · app shell offline.
 * - Precarga el esqueleto mínimo (HTML, CSS y entrada JS).
 * - El resto de archivos propios (módulos ES, CSS, imágenes) se cachea al usarse: "stale-while-revalidate".
 * - Solo GET del mismo origen. Navegaciones sin red → index.html en caché.
 * Requiere que el servidor envíe `Service-Worker-Allowed: /` para /public/sw.js (ver README). Subir VERSION al desplegar. */
const VERSION = 'cde-v2';
const ROOT = self.registration.scope;   // raíz del proyecto (scope '/')
const SHELL = ['', 'index.html', 'src/app.js', 'src/shared/styles/global.css', 'public/assets/logo-cde-unab.png'].map(p => new URL(p, ROOT).href);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/api/')) return;   // la API nunca se cachea
  e.respondWith((async () => {
    const cache = await caches.open(VERSION), hit = await cache.match(req);
    const net = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; });
    if (hit) { net.catch(() => {}); return hit; }
    try { return await net; }
    catch { return req.mode === 'navigate' ? (await cache.match(new URL('index.html', ROOT).href)) ?? Response.error() : Response.error(); }
  })());
});
