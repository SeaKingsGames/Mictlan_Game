// Service worker de Cartas del Quinto Sol: permite instalar el juego y que abra rápido.
// - Páginas: primero internet (para tener siempre la versión nueva); sin internet, la guardada.
// - Archivos de /assets/ (tienen huella en el nombre): se guardan y se reusan.
// - Supabase y todo lo de otros dominios: nunca se guarda (cuentas, duelos y premios siempre en vivo).
const CACHE = 'quinto-sol-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icono.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // Supabase, fuentes, etc.

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('/index.html', copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('/index.html'))),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/cards/') || SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })),
    );
  }
});
