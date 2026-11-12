/* guard-sw.js · v1.0.0 · 12/11/2026 · סורק השער כאפליקציה · פיתוח: רני בן זאב
   scope: guard-scan.html בלבד. הדף והאייקונים — קודם מהרשת, ובלי רשת מהשמור (כדי שהאפליקציה תיפתח).
   ספריית הסורק נשמרת בפעם הראשונה. קריאות ל-Supabase לעולם לא נשמרות — כל סריקה נבדקת בשרת. */
const CACHE = 'gm-guard-v1.0.0';
const PAGE = new URL('guard-scan.html', self.registration.scope).href;
const LIB = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
const LOCAL = ['guard-scan.html', 'guard-scan-manifest.json', 'card-icon-192.png', 'card-icon-512.png', 'card-icon-maskable-512.png'];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    try { await c.addAll(LOCAL.map(f => new URL(f, self.registration.scope).href)); } catch (err) {}
    try { c.put(LIB, await fetch(LIB, { mode: 'no-cors' })); } catch (err) {}
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('gm-guard-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || /supabase\.co/.test(req.url)) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(PAGE, cp)); } return r; })
      .catch(() => caches.match(PAGE)));
    return;
  }
  if (req.url === LIB || LOCAL.some(f => req.url.split('?')[0].endsWith('/' + f))) {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req.url.split('?')[0], cp)); return r; })
      .catch(() => caches.match(req.url.split('?')[0])));
  }
});
