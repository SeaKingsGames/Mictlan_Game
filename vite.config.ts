import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

/**
 * Arte de cartas por nombre de archivo: pon public/cards/101.jpg (o .webp / .png) y la carta 101 lo usa sola,
 * sin tocar cards.json. Si una carta tiene "art" en cards.json, gana ese.
 */
function cardArts(): Plugin {
  const id = 'virtual:card-arts';
  const dir = new URL('./public/cards/', import.meta.url);
  const order = ['webp', 'png', 'jpg', 'jpeg'];
  const scan = () => {
    const map: Record<number, string> = {};
    if (!existsSync(dir)) return map;
    for (const f of readdirSync(dir)) {
      const m = /^(\d+)\.(webp|png|jpe?g)$/i.exec(f);
      if (!m) continue;
      const n = Number(m[1]);
      const prev = map[n];
      if (!prev || order.indexOf(m[2].toLowerCase()) < order.indexOf(prev.split('.').pop()!.toLowerCase())) map[n] = `/cards/${f}`;
    }
    return map;
  };
  return {
    name: 'card-arts',
    resolveId: x => (x === id ? '\0' + id : null),
    load: x => (x === '\0' + id ? `export default ${JSON.stringify(scan())};` : null),
    configureServer(server) {
      const reload = (file: string) => {
        if (!/[\\/]public[\\/]cards[\\/]/.test(file)) return;
        const mod = server.moduleGraph.getModuleById('\0' + id);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', reload);
      server.watcher.on('unlink', reload);
    },
  };
}

// Versión que se ve en el juego: la de package.json (súbela tú al sacar una versión: 1.0.0 → 1.1.0)
// + el commit de GitHub que construyó Vercel, para saber exactamente qué está publicado.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
const commit = (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7);
const built = new Date().toISOString().slice(0, 10);

// Páginas: el juego (index.html), la galería de cartas (cartas.html) el editor de fusiones (fusiones.html) y el de cartas (editor-cartas.html).
export default defineConfig({
  plugins: [cardArts()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD__: JSON.stringify(commit ? `${built} · ${commit}` : built),
  },
  build: {
    rolldownOptions: {
      input: {
        main: 'index.html',
        cartas: 'cartas.html',
        fusiones: 'fusiones.html',
        editorCartas: 'editor-cartas.html',
        descargar: 'descargar.html',
      },
    },
  },
});
