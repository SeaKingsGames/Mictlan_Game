// Service worker de Cartas del Quinto Sol: permite instalar el juego y que abra AL INSTANTE.
// - La página abre con la versión guardada (sin esperar a internet) y en segundo plano se baja la nueva;
//   si hay versión nueva, se avisa al juego para que ofrezca "Actualizar".
// - Archivos de /assets/ (tienen huella en el nombre): se guardan y se reusan.
// - Recursos (/cards/, /duelists/, /menu/, /sounds/, con ?v=<huella>): se guardan en "quinto-sol-recursos",
//   que NO se borra al actualizar el juego. "Descargar recursos" (Opciones) la llena de una vez.
//   La música solo sale de ahí si ya se descargó (con soporte de "Range" para que el audio funcione).
// - Supabase y todo lo de otros dominios: nunca se guarda (cuentas, duelos y premios siempre en vivo).
// OJO: Vercel redirige /index.html → / ; por eso la página se guarda SIEMPRE como "/" y sin redirección,
// porque Android no abre una app si el service worker le entrega una respuesta redirigida.
const CACHE = 'quinto-sol-v5';
const RES = 'quinto-sol-recursos';
const RESOURCE = /^\/(cards|duelists|menu|sounds)\//;
const HOME = '/';
const SHELL = [HOME, '/manifest.webmanifest', '/icono.svg', '/icon-192.png', '/icon-512.png'];

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
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== RES).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Responde un pedazo ("Range") de un audio guardado completo, como lo haría el servidor. */
async function rangeResponse(req, res) {
  const range = req.headers.get('range');
  if (!range) return res;
  const buf = await res.arrayBuffer();
  const size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  if (!m || (!m[1] && !m[2])) return new Response(buf, { status: 200, headers: res.headers });
  let start = m[1] ? Number(m[1]) : size - Number(m[2]);
  let end = m[1] && m[2] ? Number(m[2]) : size - 1;
  start = Math.max(0, start); end = Math.min(end, size - 1);
  if (start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  const chunk = buf.slice(start, end + 1);
  return new Response(chunk, { status: 206, headers: {
    'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
    'Content-Range': `bytes ${start}-${end}/${size}`,
    'Content-Length': String(chunk.byteLength),
    'Accept-Ranges': 'bytes',
  } });
}

/** Baja la página nueva y la guarda. Si cambió, avisa a las pestañas abiertas. */
async function refreshHome(cache) {
  const old = await cache.match(HOME);
  const oldText = old ? await old.clone().text() : null;
  const res = await clean(await fetch(HOME, { cache: 'no-store' }));
  if (!res.ok) return res;
  const text = await res.clone().text();
  await cache.put(HOME, res.clone());
  if (oldText !== null && oldText !== text) {
    const tabs = await self.clients.matchAll({ type: 'window' });
    tabs.forEach(t => t.postMessage({ type: 'update-ready' }));
  }
  return res;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // Supabase, etc.

  if (req.mode === 'navigate') {
    const isHome = url.pathname === '/' || url.pathname === '/index.html';
    if (!isHome) return;                                     // /descargar y demás: normal
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const saved = await cache.match(HOME);
      const update = refreshHome(cache);
      if (saved) {
        event.waitUntil(update.catch(() => { /* sin internet: queda la guardada */ }));
        return saved;                                        // abre ya, sin esperar a internet
      }
      try { return await update; } catch { return Response.error(); }
    })());
    return;
  }

  if (RESOURCE.test(url.pathname)) {
    if (url.pathname.includes('/musica')) {
      // Música: de lo descargado si está; si no, directo de internet (sin guardar pedazos sueltos).
      event.respondWith(caches.open(RES).then(c => c.match(req.url)).then(hit => (hit ? rangeResponse(req, hit) : fetch(req))));
      return;
    }
    event.respondWith(caches.open(RES).then(async cache => {
      const hit = await cache.match(req.url);
      if (hit) return hit;
      const res = await clean(await fetch(req));
      if (res.ok && res.status === 200) cache.put(req.url, res.clone()).catch(() => { /* sin espacio: no pasa nada */ });
      return res;
    }));
    return;
  }

  if (url.pathname.startsWith('/assets/') || SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(async res => {
        const ok = await clean(res);
        if (ok.ok) { const copy = ok.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return ok;
      })),
    );
  }
});
