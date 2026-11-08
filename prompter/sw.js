/* prompter/sw.js · v1.1.0 · טלפרומפטר — עובד גם בלי אינטרנט. הדף: רשת קודם, ואם אין — מהמטמון. פיתוח: רני בן זאב */
const C = 'prompter-v1.1.0';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('prompter-') && k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request; if(r.method !== 'GET') return;
  if(r.mode === 'navigate'){
    e.respondWith(fetch(r, {cache: 'no-store'}).then(res => { const cp = res.clone(); caches.open(C).then(c => c.put('./index.html', cp)); return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => {
    if(res.ok && (new URL(r.url).origin === location.origin || /fonts\.(googleapis|gstatic)\.com/.test(r.url))){ const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); }
    return res;
  }).catch(() => hit)));
});
