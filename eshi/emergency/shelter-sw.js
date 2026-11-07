// shelter-sw.js — שמירת מסך סריקת המקלט בטלפון, כדי שייפתח גם בלי אינטרנט
// גרסה: v1.0.0 | 2026-11-07 | פיתוח: רני בן זאב
// נרשם עם scope של shelter-scan.html בלבד, כדי לא להתנגש עם הכרטיס או עם מערכת הנוכחות.
const CACHE = 'shelter-v1.0.0';
const PAGE = new URL('./shelter-scan.html', self.location).href;
const LIBS = [
  'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll([PAGE, ...LIBS])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('shelter-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return;           // נתונים — תמיד מהרשת, הדף מטפל בתור

  // הדף עצמו: קודם רשת (כדי לקבל עדכונים), ובלי רשת — העותק השמור
  if (req.mode === 'navigate' || url.href.split('?')[0] === PAGE) {
    e.respondWith(
      fetch(req).then(r => {
        if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(PAGE, copy)); }
        return r;
      }).catch(() => caches.match(PAGE))
    );
    return;
  }

  // ספריות: קודם העותק השמור
  if (LIBS.includes(url.href)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
  }
});
