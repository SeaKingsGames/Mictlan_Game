// Service worker de Cartas del Quinto Sol: permite instalar el juego y que abra rápido.
// - Páginas: primero internet (para tener siempre la versión nueva); sin internet o si tarda, la guardada.
// - Archivos de /assets/ (tienen huella en el nombre): se guardan y se reusan.
// - Supabase y todo lo de otros dominios: nunca se guarda (cuentas, duelos y premios siempre en vivo).
// OJO: Vercel redirige /index.html → / ; por eso la página se guarda SIEMPRE como "/" y sin redirección,
// porque Android no abre una app si el service worker le entrega una respuesta redirigida.
const CACHE = 'quinto-sol-v2';
const HOME = '/';
const SHELL = [HOME, '/manifest.webmanifest', '/icono.svg', '/icon-192.png', '/icon-512.png'];
const NAV_TIMEOUT_MS = 4000;

/** Copia "limpia" de una respuesta (sin la marca de redirección). */
async function clean(res) {
  if (!res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const url of SHELL) {
      try {
        const res = await fetch(url, { cache: 'reload' });
        if (res.ok) await cache.put(url, await clean(res));
      } catch { /* si algo falla, el juego igual funciona en línea */ }
    }
    await self.skipWaiting();
  })());
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
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const isHome = url.pathname === '/' || url.pathname === '/index.html';
      const network = fetch(req).then(async res => {
        const ok = await clean(res);
        if (ok.ok && isHome) cache.put(HOME, ok.clone());
        return ok;
      });
      // Si internet tarda mucho (señal débil), abre con la versión guardada
      const timeout = new Promise(resolve => setTimeout(resolve, NAV_TIMEOUT_MS, null));
      try {
        const fast = await Promise.race([network, timeout]);
        if (fast) return fast;
      } catch { /* sin internet */ }
      const saved = isHome ? await cache.match(HOME) : null;
      if (saved) return saved;
      return network.catch(() => cache.match(HOME).then(r => r || Response.error()));
    })());
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/cards/') || SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(async res => {
        const ok = await clean(res);
        if (ok.ok) { const copy = ok.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return ok;
      })),
    );
  }
});
