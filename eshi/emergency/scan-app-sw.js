/* scan-app-sw.js · v1.0.0 · 12/11/2026 · אפליקציית הסורק של הצוות · פיתוח: רני בן זאב
   scope: scan-app.html בלבד (כל סורק שומר על ה-service worker שלו). הדף — קודם מהרשת, ובלי רשת מהשמור. */
const CACHE = 'gm-scanapp-v1.0.0';
const PAGE = new URL('scan-app.html', self.registration.scope).href;
const LOCAL = ['scan-app.html', 'scan-app-manifest.json', 'card-icon-192.png', 'card-icon-512.png', 'card-icon-maskable-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE)
  .then(c => c.addAll(LOCAL.map(f => new URL(f, self.registration.scope).href))).catch(() => {}).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys()
  .then(ks => Promise.all(ks.filter(k => k.startsWith('gm-scanapp-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || /supabase\.co/.test(req.url)) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(PAGE, cp)); } return r; })
      .catch(() => caches.match(PAGE)));
  }
});
