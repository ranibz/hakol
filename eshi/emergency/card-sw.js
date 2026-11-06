/* card-sw.js · v1.0.0 · 06/11/2026 · כרטיס תלמיד כאפליקציה · פיתוח: רני בן זאב
   נרשם עם scope של student-card.html בלבד — לא נוגע ב-emergency-drill.html ובשאר הדפים בתיקייה.
   הדף: קודם מהרשת (כך עדכונים מגיעים מיד), ובלי רשת — מהשמור. כך הכרטיס נפתח גם בלי אינטרנט.
   ספריית ה-QR מ-cdnjs נשמרת בפעם הראשונה ומוגשת מהשמור.
   קריאות ל-Supabase לא נשמרות לעולם — רישום איחור חייב להגיע לשרת באמת. */
const CACHE = 'gm-card-v1.0.0';
const PAGE = new URL('student-card.html', self.registration.scope).href;
const QR_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
const LOCAL = ['student-card.html', 'card-manifest.json', 'card-icon-192.png', 'card-icon-512.png',
               'card-icon-maskable-512.png', 'card-apple-touch.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(LOCAL.map(f => new URL(f, self.registration.scope).href));
    try { c.put(QR_LIB, await fetch(QR_LIB, { mode: 'no-cors' })); } catch (err) {}
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('gm-card-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(PAGE, copy)); }
      return r;
    }).catch(() => caches.match(PAGE)));
    return;
  }
  if (req.url === QR_LIB) {
    e.respondWith(caches.match(QR_LIB).then(hit => hit || fetch(req).then(r => {
      const copy = r.clone(); caches.open(CACHE).then(c => c.put(QR_LIB, copy)); return r;
    })));
    return;
  }
  const u = new URL(req.url);
  if (u.origin === location.origin && /\/card-[^/]+\.(png|json)$/.test(u.pathname))
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
